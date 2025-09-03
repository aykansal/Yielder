bint = require('.bint')(256)
--[[
  This module implements the ao Standard Token Specification.

  Terms:
    Sender: the wallet or Process that sent the Message

  It will first initialize the internal state, and then attach handlers,
    according to the ao Standard Token Spec API:

    - Info(): return the token parameters, like Name, Ticker, Logo, and Denomination

    - Balance(Target?: string): return the token balance of the Target. If Target is not provided, the Sender
        is assumed to be the Target

    - Balances(): return the token balance of all participants

    - Transfer(Target: string, Quantity: number): if the Sender has a sufficient balance, send the specified Quantity
        to the Target. It will also issue a Credit-Notice to the Target and a Debit-Notice to the Sender

    - Mint(Quantity: number): if the Sender matches the Process Owner, then mint the desired Quantity of tokens, adding
        them the Processes' balance
]]
--
local json = require('json')

--[[
  utils helper functions to remove the bint complexity.
]]
--


local utils = {
    add = function(a, b)
        return tostring(bint(a) + bint(b))
    end,
    subtract = function(a, b)
        return tostring(bint(a) - bint(b))
    end,
    toBalanceValue = function(a)
        return tostring(bint(a))
    end,
    toNumber = function(a)
        return bint.tonumber(a)
    end
}


--[[
     Initialize State

     ao.id is equal to the Process.Id
   ]]
--
Variant = "0.0.3"

-- token should be idempotent and not change previous state updates
Denomination = Denomination or 12
Balances = Balances or { [ao.id] = utils.toBalanceValue(10000 * 10 ^ Denomination) }
TotalSupply = TotalSupply or utils.toBalanceValue(10000 * 10 ^ Denomination)
Name = Name or 'Yielder LP'
Ticker = Ticker or 'YLP'
Logo = Logo or 'SBCCXwwecBlDqRLUjb8dYABExTJXLieawf7m2aBJ-KY'

--[[
     Add handlers for each incoming Action defined by the ao Standard Token Specification
   ]]
--

--[[
     Info
   ]]
--
Handlers.add('info', Handlers.utils.hasMatchingTag("Action", "Info"), function(msg)
    if msg.reply then
        msg.reply({
            Name = Name,
            Ticker = Ticker,
            Logo = Logo,
            Denomination = tostring(Denomination)
        })
    else
        Send({
            Target = msg.From,
            Name = Name,
            Ticker = Ticker,
            Logo = Logo,
            Denomination = tostring(Denomination)
        })
    end
end)

--[[
     Balance
   ]]
--
Handlers.add('balance', Handlers.utils.hasMatchingTag("Action", "Balance"), function(msg)
    local bal = '0'

    -- If not Recipient is provided, then return the Senders balance
    if (msg.Tags.Recipient) then
        if (Balances[msg.Tags.Recipient]) then
            bal = Balances[msg.Tags.Recipient]
        end
    elseif msg.Tags.Target and Balances[msg.Tags.Target] then
        bal = Balances[msg.Tags.Target]
    elseif Balances[msg.From] then
        bal = Balances[msg.From]
    end
    if msg.reply then
        msg.reply({
            Balance = bal,
            Ticker = Ticker,
            Account = msg.Tags.Recipient or msg.From,
            Data = bal
        })
    else
        Send({
            Target = msg.From,
            Balance = bal,
            Ticker = Ticker,
            Account = msg.Tags.Recipient or msg.From,
            Data = bal
        })
    end
end)

--[[
     Balances
   ]]
--
Handlers.add('balances', Handlers.utils.hasMatchingTag("Action", "Balances"),
    function(msg)
        if msg.reply then
            msg.reply({ Data = json.encode(Balances) })
        else
            Send({ Target = msg.From, Data = json.encode(Balances) })
        end
    end)

--[[
     Transfer
   ]]
--
Handlers.add('transfer', Handlers.utils.hasMatchingTag("Action", "Transfer"), function(msg)
    assert(type(msg.Recipient) == 'string', 'Recipient is required!')
    assert(type(msg.Quantity) == 'string', 'Quantity is required!')
    assert(bint.__lt(0, bint(msg.Quantity)), 'Quantity must be greater than 0')

    if not Balances[msg.From] then Balances[msg.From] = "0" end
    if not Balances[msg.Recipient] then Balances[msg.Recipient] = "0" end

    if bint(msg.Quantity) <= bint(Balances[msg.From]) then
        Balances[msg.From] = utils.subtract(Balances[msg.From], msg.Quantity)
        Balances[msg.Recipient] = utils.add(Balances[msg.Recipient], msg.Quantity)

        --[[
         Only send the notifications to the Sender and Recipient
         if the Cast tag is not set on the Transfer message
       ]]
        --
        if not msg.Cast then
            -- Debit-Notice message template, that is sent to the Sender of the transfer
            local debitNotice = {
                Action = 'Debit-Notice',
                Recipient = msg.Recipient,
                Quantity = msg.Quantity,
                Data = Colors.gray ..
                    "You transferred " ..
                    Colors.blue .. msg.Quantity .. Colors.gray .. " to " .. Colors.green .. msg.Recipient .. Colors
                    .reset
            }
            -- Credit-Notice message template, that is sent to the Recipient of the transfer
            local creditNotice = {
                Target = msg.Recipient,
                Action = 'Credit-Notice',
                Sender = msg.From,
                Quantity = msg.Quantity,
                Data = Colors.gray ..
                    "You received " ..
                    Colors.blue .. msg.Quantity .. Colors.gray .. " from " .. Colors.green .. msg.From .. Colors.reset
            }

            -- Add forwarded tags to the credit and debit notice messages
            for tagName, tagValue in pairs(msg) do
                -- Tags beginning with "X-" are forwarded
                if string.sub(tagName, 1, 2) == "X-" then
                    debitNotice[tagName] = tagValue
                    creditNotice[tagName] = tagValue
                end
            end

            -- Send Debit-Notice and Credit-Notice
            if msg.reply then
                msg.reply(debitNotice)
            else
                debitNotice.Target = msg.From
                Send(debitNotice)
            end
            Send(creditNotice)
        end
    else
        if msg.reply then
            msg.reply({
                Action = 'Transfer-Error',
                ['Message-Id'] = msg.Id,
                Error = 'Insufficient Balance!'
            })
        else
            Send({
                Target = msg.From,
                Action = 'Transfer-Error',
                ['Message-Id'] = msg.Id,
                Error = 'Insufficient Balance!'
            })
        end
    end
end)

--[[
    Mint
   ]]
--
Handlers.add('mint', Handlers.utils.hasMatchingTag("Action", "Mint"), function(msg)
    assert(type(msg.Quantity) == 'string', 'Quantity is required!')
    assert(bint(0) < bint(msg.Quantity), 'Quantity must be greater than zero!')

    if not Balances[ao.id] then Balances[ao.id] = "0" end

    if msg.From == ao.id then
        -- Add tokens to the token pool, according to Quantity
        Balances[msg.From] = utils.add(Balances[msg.From], msg.Quantity)
        TotalSupply = utils.add(TotalSupply, msg.Quantity)
        if msg.reply then
            msg.reply({
                Data = Colors.gray .. "Successfully minted " .. Colors.blue .. msg.Quantity .. Colors.reset
            })
        else
            Send({
                Target = msg.From,
                Data = Colors.gray .. "Successfully minted " .. Colors.blue .. msg.Quantity .. Colors.reset
            })
        end
    else
        if msg.reply then
            msg.reply({
                Action = 'Mint-Error',
                ['Message-Id'] = msg.Id,
                Error = 'Only the Process Id can mint new ' .. Ticker .. ' tokens!'
            })
        else
            Send({
                Target = msg.From,
                Action = 'Mint-Error',
                ['Message-Id'] = msg.Id,
                Error = 'Only the Process Id can mint new ' .. Ticker .. ' tokens!'
            })
        end
    end
end)

--[[
     Total Supply
   ]]
--
Handlers.add('totalSupply', Handlers.utils.hasMatchingTag("Action", "Total-Supply"), function(msg)
    assert(msg.From ~= ao.id, 'Cannot call Total-Supply from the same process!')
    if msg.reply then
        msg.reply({
            Action = 'Total-Supply',
            Data = TotalSupply,
            Ticker = Ticker
        })
    else
        Send({
            Target = msg.From,
            Action = 'Total-Supply',
            Data = TotalSupply,
            Ticker = Ticker
        })
    end
end)

--[[
 Burn
]] --
Handlers.add('burn', Handlers.utils.hasMatchingTag("Action", 'Burn'), function(msg)
    assert(type(msg.Tags.Quantity) == 'string', 'Quantity is required!')
    assert(bint(msg.Tags.Quantity) <= bint(Balances[msg.From]),
        'Quantity must be less than or equal to the current balance!')

    assert(USERS_STAKE_TRACK[msg.User] and USERS_STAKE_TRACK[msg.User][msg.Pool],
        "Burn failed: User has no stake record in the specified pool.")

    USERS_STAKE_TRACK[msg.User][msg.Pool]["burn_timestamp"] = msg.Timestamp

    Balances[msg.From] = utils.subtract(Balances[msg.From], msg.Tags.Quantity)
    TotalSupply = utils.subtract(TotalSupply, msg.Tags.Quantity)

    if findDEXByPool(msg.TokenXAddress, msg.TokenYAddress, msg.Pool) == "PERMASWAP" then
        remove_liquidity(msg.User, tonumber(msg.Tags.Quantity), msg.Pool, msg.TokenXAddress, msg.TokenYAddress,
            tonumber(msg.TokenXQuantity), tonumber(msg.TokenYQuantity))
    end
    if findDEXByPool(msg.TokenXAddress, msg.TokenYAddress, msg.Pool) == "BOTEGA" then
        remove_liquidity(msg.User, tonumber(msg.Tags.Quantity), msg.Pool, msg.TokenXAddress, msg.TokenYAddress)
    end

    if msg.reply then
        msg.reply({
            Data = Colors.gray .. "Successfully burned " .. Colors.blue .. msg.Tags.Quantity .. Colors.reset
        })
    else
        Send({
            Target = msg.From,
            Data = Colors.gray ..
                "Successfully burned " .. Colors.blue .. msg.Tags.Quantity .. Colors.reset
        })
    end
end)


Handlers.add("YT1Airdrop", "YT1Airdrop", function(msg)
    -- Quantity: send any number (no need for denomination) e.g. 2.0, 23, 26.98
    Send({
        Target = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU",
        Action = "Airdrop",
        Quantity = msg.Quantity,
        Recipient =
            msg.From
    })
end)

Handlers.add("YT2Airdrop", "YT2Airdrop", function(msg)
    -- Quantity: send any number (no need for denomination) e.g. 2.0, 23, 26.98
    Send({
        Target = "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc",
        Action = "Airdrop",
        Quantity = msg.Quantity,
        Recipient =
            msg.From
    })
end)

Handlers.add("YT3Airdrop", "YT3Airdrop", function(msg)
    -- Quantity: send any number (no need for denomination) e.g. 2.0, 23, 26.98
    Send({
        Target = "CgD7STeX0_VDlNwNnB4_qQLg4nb4okqXQgTki0sFXSM",
        Action = "Airdrop",
        Quantity = msg.Quantity,
        Recipient =
            msg.From
    })
end)


------------------------------------------------------------------------------------------------------------------------
HISTORICAL_RESERVES = HISTORICAL_RESERVES or {}
CRONDATAPOOL = CRONDATAPOOL or {}

YT1 = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU"
YT2 = "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc"
YT3 = "CgD7STeX0_VDlNwNnB4_qQLg4nb4okqXQgTki0sFXSM"

USER_BEST_STAKE_RESPONSE = USER_BEST_STAKE_RESPONSE or {}

POOL = {
    PERMASWAP = {
        [YT1 .. "_" .. YT2] = {
            "3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w"
        },
        [YT2 .. "_" .. YT1] = {
            "3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w"
        },
        [YT3 .. "_" .. YT2] = {
            "7YDBq2EZYQk8o_5Lbm6HcxIYqjWcr65ShmKBHH4XqRU"
        },
        [YT2 .. "_" .. YT3] = {
            "7YDBq2EZYQk8o_5Lbm6HcxIYqjWcr65ShmKBHH4XqRU"
        },
        [YT1 .. "_" .. YT3] = {
            "bmR1GHhqKJa9MrQe9g8gC8OrNcitWyFRuVKADIKNXc8"
        },
        [YT3 .. "_" .. YT1] = {
            "bmR1GHhqKJa9MrQe9g8gC8OrNcitWyFRuVKADIKNXc8"
        }
    },
    BOTEGA = {
        [YT1 .. "_" .. YT2] = {
            "Q9uyLNaNvuFHvNrQQZ_XuOrRZ6OEE0KqSEPJJj8Z4Ys"
        },
        [YT2 .. "_" .. YT1] = {
            "Q9uyLNaNvuFHvNrQQZ_XuOrRZ6OEE0KqSEPJJj8Z4Ys"
        },
        [YT3 .. "_" .. YT2] = {
            "76IKbymu5DvaYaZcbMvEJg_WI9LNzZgzv3vcFmgES2M"
        },
        [YT2 .. "_" .. YT3] = {
            "76IKbymu5DvaYaZcbMvEJg_WI9LNzZgzv3vcFmgES2M"
        },
        [YT1 .. "_" .. YT3] = {
            "w5UW-qIme4BWojTRQBqFRsweuzWzA-Hy9KExmJM5DMg"
        },
        [YT3 .. "_" .. YT1] = {
            "w5UW-qIme4BWojTRQBqFRsweuzWzA-Hy9KExmJM5DMg"
        }
    }
}

function findTokenPairPools(tokenA, tokenB)
    local result = {}

    local pair1 = tokenA .. "_" .. tokenB
    local pair2 = tokenB .. "_" .. tokenA

    for dexName, dexPools in pairs(POOL) do
        if dexPools[pair1] then
            if not result[dexName] then
                result[dexName] = {}
            end
            for _, poolAddress in ipairs(dexPools[pair1]) do
                table.insert(result[dexName], poolAddress)
            end
        elseif dexPools[pair2] then
            if not result[dexName] then
                result[dexName] = {}
            end
            for _, poolAddress in ipairs(dexPools[pair2]) do
                table.insert(result[dexName], poolAddress)
            end
        end
    end

    return result
end

-- Function to find pools for all token pairs
function findAllTokenPairPools()
    local allPools = {}
    local tokenPairs = {
        { YT1, YT2 },
        { YT1, YT3 },
        { YT2, YT3 }
    }

    for _, pair in ipairs(tokenPairs) do
        local tokenA, tokenB = pair[1], pair[2]
        local pairKey1 = tokenA .. "_" .. tokenB
        local pairKey2 = tokenB .. "_" .. tokenA

        for dexName, dexPools in pairs(POOL) do
            if dexPools[pairKey1] then
                if not allPools[dexName] then
                    allPools[dexName] = {}
                end
                for _, poolAddress in ipairs(dexPools[pairKey1]) do
                    -- Avoid duplicates
                    local found = false
                    for _, existing in ipairs(allPools[dexName]) do
                        if existing == poolAddress then
                            found = true
                            break
                        end
                    end
                    if not found then
                        table.insert(allPools[dexName], poolAddress)
                    end
                end
            end
        end
    end

    return allPools
end

function findBestPool(poolsToAnalyze)
    local allPools = {}

    -- **THE FIX**: Use the provided 'poolsToAnalyze' table, not the global DATA_POOL.
    for dexName, pools in pairs(poolsToAnalyze) do
        for poolAddress, poolData in pairs(pools) do
            if poolData.tvl and poolData.tvl > 0 then -- Only consider pools with valid TVL
                table.insert(allPools, poolData)
            end
        end
    end

    if #allPools == 0 then return nil end

    -- The rest of the logic is correct and remains the same
    table.sort(allPools, function(a, b) return a.apr > b.apr end)

    local bestPool = allPools[1]

    if bestPool.tvl < 1000 and #allPools > 1 then
        for i = 2, math.min(5, #allPools) do
            local candidate = allPools[i]
            if candidate.apr >= bestPool.apr * 0.8 and candidate.tvl > bestPool.tvl * 3 then
                bestPool = candidate
                break
            end
        end
    end

    return bestPool
end

function getTagValue(tagArray, tagName)
    if not tagArray then return nil end
    for _, tag in ipairs(tagArray) do
        if tag.name == tagName then
            return tag.value
        end
    end
    return nil
end

function extractReserves(poolData, reservesTagArray)
    local reserves = {}

    if poolData.dexName == "BOTEGA" then
        if reservesTagArray then
            for _, tag in ipairs(reservesTagArray) do
                if string.len(tag.name) >= 40 and tag.name ~= "Action" and tag.name ~= "Reference" and
                    tag.name ~= "X-Reference" and tag.name ~= "Data-Protocol" and tag.name ~= "Type" and
                    tag.name ~= "Variant" and tag.name ~= "From-Process" and tag.name ~= "From-Module" and
                    tag.name ~= "Pushed-For" then
                    reserves[tag.name] = tonumber(tag.value) or 0
                end
            end
        end
    elseif poolData.dexName == "PERMASWAP" then
        if poolData.tokenA and poolData.px then
            reserves[poolData.tokenA] = tonumber(poolData.px) or 0
        end
        if poolData.tokenB and poolData.py then
            reserves[poolData.tokenB] = tonumber(poolData.py) or 0
        end
    end

    return reserves
end

function calculateTVL(reserves)
    local totalTvl = 0

    for tokenAddress, reserveAmount in pairs(reserves) do
        local tokenPrice = TOKEN_PRICES[tokenAddress] or 0
        -- Convert from smallest units (divide by 10^12 for 12 decimals)
        local humanReadableAmount = reserveAmount / (10 ^ 12)
        totalTvl = totalTvl + (humanReadableAmount * tokenPrice)
    end

    return totalTvl
end

function timestamp_to_datetime(timestamp)
    local seconds_in_minute = 60
    local seconds_in_hour = 3600
    local seconds_in_day = 86400

    -- Days in months for non-leap year
    local month_days = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 }

    -- Leap year check
    local function is_leap_year(year)
        return (year % 4 == 0 and year % 100 ~= 0) or (year % 400 == 0)
    end

    -- Calculate total days since epoch and remaining seconds
    local total_days = math.floor(timestamp / seconds_in_day)
    local remaining_seconds = timestamp % seconds_in_day

    -- Calculate year
    local year = 1970
    local days = total_days

    while true do
        local days_in_year = is_leap_year(year) and 366 or 365
        if days >= days_in_year then
            days = days - days_in_year
            year = year + 1
        else
            break
        end
    end

    -- Calculate month
    local month = 1
    for i = 1, 12 do
        local days_in_month = month_days[i]
        if i == 2 and is_leap_year(year) then
            days_in_month = 29
        end

        if days >= days_in_month then
            days = days - days_in_month
            month = month + 1
        else
            break
        end
    end

    local day = days + 1
    local hour = math.floor(remaining_seconds / seconds_in_hour)
    remaining_seconds = remaining_seconds % seconds_in_hour
    local minute = math.floor(remaining_seconds / seconds_in_minute)
    local second = remaining_seconds % seconds_in_minute

    -- Return structured table for easy calculations
    return {
        -- Basic components (integers for arithmetic)
        year = year,
        month = month,
        day = day,
        hour = hour,
        minute = minute,
        second = second,

        -- Additional useful values for calculations
        timestamp = timestamp,
        total_days_since_epoch = total_days,
        day_of_year = total_days - math.floor((year - 1970) * 365.25) + 1,

        -- Derived values for comparisons
        year_month = year * 100 + month,                   -- 202508 for easy month comparison
        year_month_day = year * 10000 + month * 100 + day, -- 20250827 for date comparison
        time_minutes = hour * 60 + minute,                 -- Total minutes since midnight
        time_seconds = hour * 3600 + minute * 60 + second, -- Total seconds since midnight

        -- Week day (0 = Thursday, 1 = Friday, ... 6 = Wednesday, since epoch was Thursday)
        weekday = (total_days + 4) % 7,

        -- Quarter
        quarter = math.ceil(month / 3),

        -- Is leap year flag
        is_leap_year = is_leap_year(year)
    }
end

-- =========================================================================
-- The NEW self-managing estimate24hVolume function
-- =========================================================================
function estimate24hVolume(poolAddress, currentReserves, currentTimestamp)
    -- Step 1: Initialize the entire structure if this is the first time seeing the pool
    if not HISTORICAL_RESERVES[poolAddress] then
        -- print("  - First time seeing pool. Initializing history structure for " .. poolAddress)
        HISTORICAL_RESERVES[poolAddress] = {
            history = {},
            latest_reserve = {}
        }
    end

    -- print("HISTORICAL_RESERVES = " .. require("json").encode(HISTORICAL_RESERVES[poolAddress]))

    -- Get a direct reference to this pool's historical data
    local poolDataHistory = HISTORICAL_RESERVES[poolAddress]

    if #poolDataHistory.history == 0 then
        table.insert(poolDataHistory.history, {
            reserves = currentReserves,
            timestamp = currentTimestamp
        })
    end


    poolDataHistory.latest_reserve = {
        reserves = currentReserves,
        timestamp = currentTimestamp
    }

    -- print("poolDataHistory = " .. require("json").encode(poolDataHistory))


    -- loll = {  {
    --     reserves = 213124135426373632312,
    --     timestamp = 21312415415
    --    },  {
    --     reserves = 52643754753t42t532,
    --     timestamp = 41441413413243252
    --    },  {
    --     reserves = 42353253463734,
    --     timestamp = 235325252
    --    }}

    local today = timestamp_to_datetime(currentTimestamp)
    local yesterday = timestamp_to_datetime(currentTimestamp - 86400)

    local yesterdays_last_entry = nil
    local latest_yesterday_timestamp = 0

    -- print("today = " .. require("json").encode(today))
    -- print("yesterday = " .. require("json").encode(yesterday))
    -- print("yesterdays_last_entry_0 = " .. require("json").encode(yesterdays_last_entry))
    -- print("latest_yesterday_timestamp_0 = " .. tostring(latest_yesterday_timestamp))

    -- Finding the recent yesterday entry
    for _, snapshot in ipairs(poolDataHistory.history) do
        local snapshot_datetime = timestamp_to_datetime(snapshot.timestamp)
        if snapshot_datetime.year_month_day == yesterday.year_month_day then
            if snapshot.timestamp > latest_yesterday_timestamp then
                latest_yesterday_timestamp = snapshot.timestamp
                yesterdays_last_entry = snapshot
            end
        end
    end

    -- print("yesterdays_last_entry_1 = " .. require("json").encode(yesterdays_last_entry))
    -- print("latest_yesterday_timestamp_1 = " .. require("json").encode(latest_yesterday_timestamp))

    if yesterdays_last_entry == nil then
        for _, snapshot in ipairs(poolDataHistory.history) do
            local snapshot_datetime = timestamp_to_datetime(snapshot.timestamp)
            if snapshot_datetime.year_month_day < yesterday.year_month_day then
                if snapshot.timestamp > latest_yesterday_timestamp then
                    latest_yesterday_timestamp = snapshot.timestamp
                    yesterdays_last_entry = snapshot
                    yesterday = timestamp_to_datetime(snapshot.timestamp)
                end
            end
        end
        -- print("yesterdays_last_entry_2 = " .. require("json").encode(yesterdays_last_entry))
        -- print("latest_yesterday_timestamp_2 = " .. require("json").encode(latest_yesterday_timestamp))
    end



    if yesterdays_last_entry == nil then
        for _, snapshot in ipairs(poolDataHistory.history) do
            local snapshot_datetime = timestamp_to_datetime(snapshot.timestamp)
            if snapshot_datetime.year_month_day == today.year_month_day then
                if snapshot.timestamp > latest_yesterday_timestamp then
                    latest_yesterday_timestamp = snapshot.timestamp
                    yesterdays_last_entry = snapshot
                    yesterday = timestamp_to_datetime(snapshot.timestamp)
                end
            end
        end
        -- print("yesterdays_last_entry_3 = " .. require("json").encode(yesterdays_last_entry))
        -- print("latest_yesterday_timestamp_3 = " .. require("json").encode(latest_yesterday_timestamp))
    end




    -- Filter out old data and check conditions
    local filtered_history = {}
    local past_data_was_found = false

    for _, snapshot in ipairs(poolDataHistory.history) do
        local snapshot_datetime = timestamp_to_datetime(snapshot.timestamp)
        -- Keep data from yesterday, today, or the future
        if snapshot_datetime.year_month_day >= yesterday.year_month_day then
            table.insert(filtered_history, snapshot)
        else
            -- Mark that we found and are discarding past data
            past_data_was_found = true
        end
    end

    -- print("filtered_history = " .. require("json").encode(filtered_history))
    -- print("past_data_was_found = " .. require("json").encode(past_data_was_found))

    poolDataHistory.history = filtered_history

    -- print("poolDataHistory.history = " .. require("json").encode(poolDataHistory.history))


    -- 4. Conditionally insert the new entry
    if yesterdays_last_entry and past_data_was_found then
        -- print("Conditions met: Inserting new entry.")
        table.insert(poolDataHistory.history, poolDataHistory.latest_reserve)
    end

    -- print("poolDataHistory.history = " .. require("json").encode(poolDataHistory.history))


    -- 5. Smartly prune the list to 15 entries
    if #poolDataHistory.history > 15 then
        -- Sort by timestamp to easily identify the newest entries
        table.sort(poolDataHistory.history, function(a, b) return a.timestamp > b.timestamp end)

        -- Keep the top 15 newest entries
        local pruned_loll = {}
        for i = 1, 15 do
            pruned_loll[i] = poolDataHistory.history[i]
        end

        -- Ensure yesterday's entry is still present if it was filtered out
        if yesterdays_last_entry then
            local is_present = false
            for _, snapshot in ipairs(pruned_loll) do
                if snapshot.timestamp == yesterdays_last_entry.timestamp then
                    is_present = true
                    break
                end
            end

            if not is_present then
                -- print("Yesterday's entry was pruned. Re-inserting it.")
                table.remove(pruned_loll, 15)                    -- Remove the oldest of the top 15
                table.insert(pruned_loll, yesterdays_last_entry) -- Add it back
            end
        end
        -- print("pruned_loll = " .. require("json").encode(pruned_loll))
        poolDataHistory.history = pruned_loll
    end




    -- local latestSnapshot = poolDataHistory.latest_reserve

    -- -- Step 2: Handle the End-of-Day Snapshot Logic
    -- if latestSnapshot.timestamp then
    --     local current_datetime = timestamp_to_datetime(currentTimestamp)
    --     local latest_datetime = timestamp_to_datetime(latestSnapshot.timestamp)

    --     -- If the current day is newer than the latest snapshot's day, archive it
    --     if current_datetime.year_month_day > latest_datetime.year_month_day then
    --         print("  - New day detected. Archiving yesterday's final reserve data for " .. poolAddress)
    --         table.insert(poolDataHistory.history, latestSnapshot)

    --         -- Keep the history pruned to a maximum of 15 entries
    --         if #poolDataHistory.history > 15 then
    --             table.remove(poolDataHistory.history, 1) -- Remove the oldest entry
    --         end
    --     end
    -- end

    -- -- Step 3: Find Yesterday's Data for Calculation
    -- local yesterday_timestamp = currentTimestamp - (24 * 3600 * 1000)
    -- local yesterday = timestamp_to_datetime(yesterday_timestamp)

    -- local historicalSnapshot = nil
    -- for i = #poolDataHistory.history, 1, -1 do
    --     local snapshot = poolDataHistory.history[i]
    --     local snapshot_datetime = timestamp_to_datetime(snapshot.timestamp)
    --     if snapshot_datetime.year_month_day == yesterday.year_month_day then
    --         historicalSnapshot = snapshot
    --         break
    --     end
    -- end

    -- Only returns a value if old and current are from different days
    function calculate_reserve_change(old_reserve, current_reserve)
        if old_reserve == nil or current_reserve == nil then
            return 0
        end
        return math.abs(current_reserve - old_reserve)
    end

    -- print("yesterdays_last_entry = " .. require("json").encode(yesterdays_last_entry))
    -- Step 4: Calculate Volume
    local estimatedVolume = 0
    if yesterdays_last_entry then
        -- Only count if not the exact same timestamp
        if yesterdays_last_entry.timestamp ~= currentTimestamp then
            local oldReserves = yesterdays_last_entry.reserves
            local totalValueChange = 0
            for tokenAddress, currentAmount in pairs(currentReserves) do
                local reserveChange = calculate_reserve_change(oldReserves[tokenAddress] or 0, currentAmount)
                local humanReadableChange = reserveChange / (10 ^ 12)
                local tokenPrice = TOKEN_PRICES[tokenAddress] or 0
                totalValueChange = totalValueChange + humanReadableChange * tokenPrice
            end
            -- Also handle reserves dropped (removal of a token)
            for tokenAddress, oldAmount in pairs(oldReserves) do
                if currentReserves[tokenAddress] == nil then
                    local reserveChange = calculate_reserve_change(oldAmount, 0)
                    local humanReadableChange = reserveChange / (10 ^ 12)
                    local tokenPrice = TOKEN_PRICES[tokenAddress] or 0
                    totalValueChange = totalValueChange + humanReadableChange * tokenPrice
                end
            end
            estimatedVolume = totalValueChange / 2
        end
    end


    -- Step 5: **ALWAYS** update the 'latest_reserve' with the current data for the next run
    -- poolDataHistory.latest_reserve = {
    --     reserves = currentReserves,
    --     timestamp = currentTimestamp
    -- }

    return estimatedVolume
end

function calculateAPR(volume24h, fee, tvl)
    if tvl <= 0 then return 0 end

    local feeRate = tonumber(fee) or 0
    if feeRate > 1 then
        feeRate = feeRate / 10000
    else
        feeRate = feeRate / 100
    end

    local dailyFees = volume24h * feeRate
    local apr = ((dailyFees * 365) / tvl) * 100
    return apr
end

-- function getTagValue(dexName, poolAddress, tagName)
--     if DATA_POOL[dexName] and DATA_POOL[dexName][poolAddress] and DATA_POOL[dexName][poolAddress].TagArray then
--         for _, tag in ipairs(DATA_POOL[dexName][poolAddress].TagArray) do
--             if tag.name == tagName then
--                 return tag.value
--             end
--         end
--     end
--     return nil
-- end

-- Function to determine risk level
function getBestPoolRiskLevel(poolData)
    if poolData.tvl >= 100000 then
        return "🛡️ Conservative (High TVL)"
    elseif poolData.tvl >= 10000 then
        return "⚖️ Balanced (Medium TVL)"
    else
        return "🥇 Aggressive (Low TVL, High Risk)"
    end
end

function findDEXByPool(tokenX_address, tokenY_address, target_pool)
    local pair1 = tokenX_address .. "_" .. tokenY_address
    local pair2 = tokenY_address .. "_" .. tokenX_address

    for dexName, dexPools in pairs(POOL) do
        -- Check both possible pair combinations
        if dexPools[pair1] then
            for _, poolAddress in ipairs(dexPools[pair1]) do
                if poolAddress == target_pool then
                    return dexName
                end
            end
        end
        if dexPools[pair2] then
            for _, poolAddress in ipairs(dexPools[pair2]) do
                if poolAddress == target_pool then
                    return dexName
                end
            end
        end
    end
    return nil -- DEX not found
end

function getTotalStakedTokenAmount(user_address, token_address)
    local total_staked = 0

    -- Check if user has any stake tracking data
    if USERS_STAKE_TRACK[user_address] then
        -- Iterate through all pools user has staked in
        for pool_address, stake_data in pairs(USERS_STAKE_TRACK[user_address]) do
            -- Check if this pool contains the token we're looking for
            if stake_data["token_x_address"] == token_address and stake_data["user_token_x"] then
                total_staked = total_staked + tonumber(stake_data["user_token_x"])
            end
            if stake_data["token_y_address"] == token_address and stake_data["user_token_y"] then
                total_staked = total_staked + tonumber(stake_data["user_token_y"])
            end
        end
    end

    return total_staked
end

function token_unit_form(amount)
    local amountStr = tostring(amount)
    local decimalPos = string.find(amountStr, "%.")

    if decimalPos then
        local integerPart = string.sub(amountStr, 1, decimalPos - 1)
        local decimalPart = string.sub(amountStr, decimalPos + 1)

        if string.len(decimalPart) < 12 then
            decimalPart = decimalPart .. string.rep("0", 12 - string.len(decimalPart))
        elseif string.len(decimalPart) > 12 then
            decimalPart = string.sub(decimalPart, 1, 12)
        end

        local result = integerPart .. decimalPart
        return tostring(bint(result))
    else
        return tostring(bint(amountStr) * bint(10 ^ 12))
    end
end

function findClosestStakeData(current_timestamp, target_pool_address)
    local closest_user = nil
    local closest_pool = nil
    local closest_diff = math.huge -- Start with infinity
    local closest_data = nil

    -- Safety check
    if not USERS_STAKE_TRACK then
        return nil, nil, nil, nil
    end

    -- Loop through all users
    for user_address, pools in pairs(USERS_STAKE_TRACK) do
        -- Loop through all pools for each user
        for pool_address, stake_data in pairs(pools or {}) do
            -- **NEW: Only process the specific target pool**
            if pool_address == target_pool_address then
                -- Check if timestamp exists in the stake data
                if stake_data and stake_data.timestamp then
                    local timestamp_diff = math.abs(current_timestamp - stake_data.timestamp)

                    -- Update closest match if this is closer
                    if timestamp_diff < closest_diff then
                        closest_diff = timestamp_diff
                        closest_user = user_address
                        closest_pool = pool_address
                        closest_data = stake_data
                    end
                end
            end
        end
    end

    return closest_user, closest_pool, closest_data, closest_diff
end

function findClosestLiquidityRemoveData(current_timestamp, target_pool_address)
    local closest_user = nil
    local closest_pool = nil
    local closest_diff = math.huge -- Start with infinity
    local closest_data = nil

    -- Safety check
    if not USERS_STAKE_TRACK then
        return nil, nil, nil, nil
    end

    -- Loop through all users
    for user_address, pools in pairs(USERS_STAKE_TRACK) do
        -- Loop through all pools for each user
        for pool_address, stake_data in pairs(pools or {}) do
            -- **NEW: Only process the specific target pool**
            if pool_address == target_pool_address then
                -- Check if timestamp exists in the stake data
                if stake_data and stake_data.burn_timestamp then
                    local timestamp_diff = math.abs(current_timestamp - stake_data.burn_timestamp)

                    -- Update closest match if this is closer
                    if timestamp_diff < closest_diff then
                        closest_diff = timestamp_diff
                        closest_user = user_address
                        closest_pool = pool_address
                        closest_data = stake_data
                    end
                end
            end
        end
    end

    return closest_user, closest_pool, closest_data, closest_diff
end

function updateTokenQuantity(user_address, pool_address, token_address, amount_to_subtract)
    -- Safety check: ensure the path exists
    if not USERS_STAKE_TRACK or
        not USERS_STAKE_TRACK[user_address] or
        not USERS_STAKE_TRACK[user_address][pool_address] then
        return false -- User or pool doesn't exist
    end

    local pool_data = USERS_STAKE_TRACK[user_address][pool_address]

    -- Check if token_address matches token_x_address and update
    if pool_data.token_x_address == token_address then
        pool_data.user_token_x = (pool_data.user_token_x or 0) - tonumber(amount_to_subtract)
        return true
        -- Check if token_address matches token_y_address and update
    elseif pool_data.token_y_address == token_address then
        pool_data.user_token_y = (pool_data.user_token_y or 0) - tonumber(amount_to_subtract)
        return true
    else
        return false -- Token not found in this pool
    end
end

-------------------------------------------------------------------------------------------------------------

DATA_POOL = DATA_POOL or {}

USER_RUNNING_HANDLER = false
-- Send({Target = "aPbLwv3daFtcPEgkH0lqgmcJQudaogBjHOOSTxNoyJY",Action = "Best-Stake",TokenX = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU",TokenY = "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc"})

-- YT1 = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU"
-- YT2 = "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc"
-- YT3 = "CgD7STeX0_VDlNwNnB4_qQLg4nb4okqXQgTki0sFXSM"

YT1_PRICE = 0.0006561367
YT2_PRICE = 0.0004531765
YT3_PRICE = 0.0002525369

-- Store historical reserve data for any number of tokens

-- Token address to price mapping
TOKEN_PRICES = {
    [YT1] = YT1_PRICE, -- YT1
    [YT2] = YT2_PRICE, -- YT2
    [YT3] = YT3_PRICE
    -- Add more token addresses as needed
}

Handlers.add("Best-Stake", "Best-Stake", function(msg)
    local TokenX = msg.Tags.TokenX
    local TokenY = msg.Tags.TokenY

    -- Update prices randomly (this part is fine)
    if math.random(1, 100) <= 15 then
        YT1_PRICE = math.random() * 0.0008999999 + 0.0001; TOKEN_PRICES[YT1] = YT1_PRICE
    end
    if math.random(1, 100) <= 15 then
        YT2_PRICE = math.random() * 0.0008999999 + 0.0001; TOKEN_PRICES[YT2] = YT2_PRICE
    end
    if math.random(1, 100) <= 15 then
        YT3_PRICE = math.random() * 0.0008999999 + 0.0001; TOKEN_PRICES[YT3] = YT3_PRICE
    end

    DATA_POOL = {}
    local all_available_pools = findTokenPairPools(TokenX, TokenY)
    local current_timestamp = msg.Timestamp

    for dexName, poolAddresses in pairs(all_available_pools) do
        if not DATA_POOL[dexName] then DATA_POOL[dexName] = {} end

        for _, address in ipairs(poolAddresses) do
            print("Processing pool: " .. address)
            print("sending message to address for INFO")
            -- Fetching data remains the same...
            local poolResponse = Send({
                Target = tostring(address),
                Action = "Info",
            }).receive()
            print("Got some answer")
            local reservesResponse = nil
            if dexName == "BOTEGA" then
                reservesResponse = Send({ Target = tostring(address), Action = "Get-Reserves" }).receive()
            end

            if poolResponse and poolResponse.TagArray then
                local poolData = {
                    -- All your poolData fields are correct...
                    name = getTagValue(poolResponse.TagArray, "Name"),
                    fee = getTagValue(poolResponse.TagArray, "Fee") or getTagValue(poolResponse.TagArray, "FeeBps"),
                    tokenA = getTagValue(poolResponse.TagArray, "TokenA") or getTagValue(poolResponse.TagArray, "X"),
                    tokenB = getTagValue(poolResponse.TagArray, "TokenB") or getTagValue(poolResponse.TagArray, "Y"),
                    px = getTagValue(poolResponse.TagArray, "PX"),
                    py = getTagValue(poolResponse.TagArray, "PY"),
                    dexName = dexName,
                    poolAddress = address
                }

                local currentReserves = extractReserves(poolData, reservesResponse and reservesResponse.TagArray)
                poolData.reserves = currentReserves
                poolData.tvl = calculateTVL(currentReserves)

                print("tvl calculated")
                -- **FIX #2**: The volume and APR will be 0 on the first run, which is CORRECT.
                -- On the second run, it will have a history to compare against.
                poolData.volume24h = estimate24hVolume(address, currentReserves, current_timestamp)
                print("volume calculated")
                poolData.apr = calculateAPR(poolData.volume24h, poolData.fee, poolData.tvl)

                -- **FIX #3**: Store the new data point AFTER calculations. REMOVED the duplicate insert from here.
                -- Your existing storage logic at the end of the handler is correct.

                DATA_POOL[dexName][address] = poolData
                print("    Stored pool data for: " ..
                    address ..
                    " | TVL: $" ..
                    string.format("%.2f", poolData.tvl) .. " | APR: " .. string.format("%.2f", poolData.apr) .. "%")
            else
                print("    No TagArray found for pool: " .. address)
            end
        end
    end

    -- **This part of your code was MISSING but is crucial for storing the history for the NEXT run.**
    -- for dexName, pools in pairs(DATA_POOL) do
    --     for address, poolData in pairs(pools) do
    --         if poolData.reserves then
    --             table.insert(HISTORICAL_RESERVES[address], {
    --                 reserves = poolData.reserves,
    --                 timestamp = current_timestamp
    --             })
    --             if #HISTORICAL_RESERVES[address] > 30 then
    --                 table.remove(HISTORICAL_RESERVES[address], 1)
    --             end
    --         end
    --     end
    -- end

    local bestPool = findBestPool(DATA_POOL)
    USER_BEST_STAKE_RESPONSE[msg.From] = bestPool
    ao.send({ Target = msg.From, Data = require("json").encode(bestPool) })
end)

-----------------------------------------------------------------------------------------------------------------------------------------------------------


Handlers.add("cronpooldata", "cronpooldata", function(msg)
    ao.send({ Target = msg.From, Data = require("json").encode(CRONDATAPOOL) })
end)

Handlers.add("best-stake-user-response", "best-stake-user-response", function(msg)
    ao.send({ Target = msg.From, Data = require("json").encode(USER_BEST_STAKE_RESPONSE[msg.From]) })
end)

-----------------------------------------------------------------------------------------------------------------------------------------------------------

-- CRON Handler - Collects data for all pools periodically
Handlers.add("cron", "cron", function(msg)
    -- Update prices randomly (15% chance each)
    if math.random(1, 100) <= 15 then
        YT1_PRICE = math.random() * (0.0009999999 - 0.0001000000) + 0.0001000000
        TOKEN_PRICES[YT1] = YT1_PRICE
    end
    if math.random(1, 100) <= 15 then
        YT2_PRICE = math.random() * (0.0009999999 - 0.0001000000) + 0.0001000000
        TOKEN_PRICES[YT2] = YT2_PRICE
    end
    if math.random(1, 100) <= 15 then
        YT3_PRICE = math.random() * (0.0009999999 - 0.0001000000) + 0.0001000000
        TOKEN_PRICES[YT3] = YT3_PRICE
    end

    CRONDATAPOOL = {}
    local all_available_pools = findAllTokenPairPools()

    local current_timestamp = msg.Timestamp

    for dexName, poolAddresses in pairs(all_available_pools) do
        print(dexName .. ":")

        if not CRONDATAPOOL[dexName] then
            CRONDATAPOOL[dexName] = {}
        end

        for _, address in ipairs(poolAddresses) do
            print("  " .. address)

            local poolResponse = Send({
                Target = tostring(address),
                Action = "Info",
            }).receive()

            local reservesResponse = nil
            if dexName == "BOTEGA" then
                reservesResponse = Send({
                    Target = tostring(address),
                    Action = "Get-Reserves",
                }).receive()
            end

            if poolResponse and poolResponse.TagArray then
                local poolData = {
                    -- Basic pool info
                    name = getTagValue(poolResponse.TagArray, "Name"),
                    ticker = getTagValue(poolResponse.TagArray, "Ticker"),
                    fee = getTagValue(poolResponse.TagArray, "Fee") or getTagValue(poolResponse.TagArray, "FeeBps"),
                    totalSupply = getTagValue(poolResponse.TagArray, "TotalSupply"),

                    -- Token info
                    tokenA = getTagValue(poolResponse.TagArray, "TokenA") or getTagValue(poolResponse.TagArray, "X"),
                    tokenB = getTagValue(poolResponse.TagArray, "TokenB") or getTagValue(poolResponse.TagArray, "Y"),
                    symbolX = getTagValue(poolResponse.TagArray, "SymbolX"),
                    symbolY = getTagValue(poolResponse.TagArray, "SymbolY"),

                    -- Pool state for Permaswap
                    px = getTagValue(poolResponse.TagArray, "PX"),
                    py = getTagValue(poolResponse.TagArray, "PY"),
                    predictedPx = getTagValue(poolResponse.TagArray, "PredictedPx"),
                    predictedPy = getTagValue(poolResponse.TagArray, "PredictedPy"),

                    -- Pool settings
                    denomination = getTagValue(poolResponse.TagArray, "Denomination"),
                    poolFeeRatio = getTagValue(poolResponse.TagArray, "PoolFeeRatio"),
                    disableSwap = getTagValue(poolResponse.TagArray, "DisableSwap"),
                    disableLiquidity = getTagValue(poolResponse.TagArray, "DisableLiquidity"),

                    -- Metadata
                    dexName = dexName,
                    poolAddress = address,
                    timestamp = poolResponse.Timestamp,
                    from = poolResponse.From,
                    TagArray = poolResponse.TagArray
                }

                -- Extract reserves
                local currentReserves = extractReserves(poolData, reservesResponse and reservesResponse.TagArray)
                poolData.reserves = currentReserves

                -- Calculate metrics
                poolData.tvl = calculateTVL(currentReserves)


                poolData.volume24h = estimate24hVolume(address, currentReserves, current_timestamp)
                poolData.apr = calculateAPR(poolData.volume24h, poolData.fee, poolData.tvl)



                CRONDATAPOOL[dexName][address] = poolData
                print("    Stored pool data for: " ..
                    address ..
                    " | TVL: $" ..
                    string.format("%.2f", poolData.tvl) .. " | APR: " .. string.format("%.2f", poolData.apr) .. "%")

                -- Print in the exact format you requested
                -- local reserveStr = ""
                -- for tokenAddr, amount in pairs(currentReserves) do
                --     reserveStr = reserveStr .. tokenAddr .. " " .. amount .. ", "
                -- end

                -- print(dexName .. " " .. address .. " disableSwap " .. (poolData.disableSwap or "false") ..
                --       ", tvl " .. poolData.tvl .. ", tokenA " .. (poolData.tokenA or "") ..
                --       ", predictedPx " .. (poolData.predictedPx or "0") .. ", disableLiquidity " .. (poolData.disableLiquidity or "false") ..
                --       ", volume24h " .. poolData.volume24h .. ", apr " .. poolData.apr ..
                --       ", ticker " .. (poolData.ticker or "") .. ", tokenB " .. (poolData.tokenB or "") ..
                --       ", reserves " .. reserveStr .. ", name " .. (poolData.name or "") ..
                --       ", symbolX " .. (poolData.symbolX or "") .. ", from " .. (poolData.from or "") ..
                --       ", timestamp " .. (poolData.timestamp or "") .. ", fee " .. (poolData.fee or "") ..
                --       ", poolFeeRatio " .. (poolData.poolFeeRatio or "") .. ", predictedPy " .. (poolData.predictedPy or "0") ..
                --       ", denomination " .. (poolData.denomination or "") .. ", dexName " .. poolData.dexName ..
                --       ", symbolY " .. (poolData.symbolY or "") .. ", poolAddress " .. poolData.poolAddress ..
                --       ", px " .. (poolData.px or "") .. ", totalSupply " .. (poolData.totalSupply or ""))
            else
                print("    No TagArray found for pool: " .. address)
            end
        end
    end
    ao.send({ Target = msg.From, Data = require("json").encode(CRONDATAPOOL) })

    print("CRON data collection completed for all token pairs")
end)

-- Handlers.add("cronpooldata", "cronpooldata", function(msg)
--     ao.send({ Target = msg.From, Data = require("json").encode(CRONDATAPOOL) })
-- end)

-- Handlers.add("best-stake-user-response", "best-stake-user-response", function(msg)
--     ao.send({ Target = msg.From, Data = require("json").encode(USER_BEST_STAKE_RESPONSE[msg.From]) })
-- end)

-----------------------------------------------------------------------------------------------------------------------------------------------------------

USERS_BALANCE = {}
USERS_STAKE_TRACK = {}
bint = require('.bint')(256)

Handlers.add("Credit-Notice", "Credit-Notice", function(msg)
    local token_sent_by = msg.Sender
    local amount_recieve = msg.Quantity
    local burn_action = false
    if msg["X-Action"] then
        burn_action = true
    end
    assert(bint.__lt(0, bint(amount_recieve)), 'Amount must be greater than 0')

    -- List of valid deposit tokens for easy checking
    local valid_deposit_tokens = {
        "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU",
        "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc",
        "CgD7STeX0_VDlNwNnB4_qQLg4nb4okqXQgTki0sFXSM"
    }
    local is_deposit_token = false
    for _, token in ipairs(valid_deposit_tokens) do
        if msg.From == token then
            is_deposit_token = true
            break
        end
    end

    -- Handle deposits of base tokens (YT1, YT2, YT3)
    if is_deposit_token then
        -- **THE FIX**: Initialize the nested tables correctly.
        -- The user's address should be the first key.
        if not USERS_BALANCE[token_sent_by] then
            USERS_BALANCE[token_sent_by] = {}
        end
        -- The token's address should be the second key.
        if not USERS_BALANCE[token_sent_by][msg.From] then
            USERS_BALANCE[token_sent_by][msg.From] = {
                address = msg.From,
                token = 0
            }
        end

        -- Now it's safe to update the balance
        USERS_BALANCE[token_sent_by][msg.From].token = USERS_BALANCE[token_sent_by][msg.From].token +
            tonumber(amount_recieve)
    end

    -- Handle receiving LP tokens back from a BOTEGA pool
    local incoming_message_from_botega = false
    for _, poolAddresses in pairs(POOL.BOTEGA) do
        for _, poolAddress in ipairs(poolAddresses) do
            if msg.From == poolAddress then
                incoming_message_from_botega = true
                break
            end
        end
        if incoming_message_from_botega then
            break
        end
    end
    if incoming_message_from_botega and not burn_action then
        local user_address, pool, data, time_difference = findClosestStakeData(msg.Timestamp, token_sent_by)

        -- **THE FIX**: Also initialize the stake tracking tables
        if not USERS_STAKE_TRACK[user_address] then
            USERS_STAKE_TRACK[user_address] = {}
        end
        if not USERS_STAKE_TRACK[user_address][msg.From] then
            USERS_STAKE_TRACK[user_address][msg.From] = {
                pool_lp_token = 0,
                yielder_lp_token = 0
            }
        end

        -- Update the amount of pool-specific LP tokens the user holds
        USERS_STAKE_TRACK[user_address][msg.From]["pool_lp_token"] = (USERS_STAKE_TRACK[user_address][msg.From]["pool_lp_token"] or 0) +
            tonumber(amount_recieve)

        -- Mint and Transfer your own project's LP token to the user
        Send({
            Target = ao.id,
            Action = "Mint",
            Quantity = tostring(amount_recieve)
        })
        Send({
            Target = ao.id,
            Action = "Transfer",
            Recipient = user_address,
            Quantity = tostring(amount_recieve)
        })

        -- Update the amount of your project's LP tokens the user holds
        USERS_STAKE_TRACK[user_address][msg.From]["yielder_lp_token"] = (USERS_STAKE_TRACK[user_address][msg.From]["yielder_lp_token"] or 0) +
            tonumber(amount_recieve)
        ao.send({
            Target = user_address,
            Data = require("json").encode({
                success = true,
                data = USERS_STAKE_TRACK[user_address][msg.From]
            })
        })
    end
    print("burn_action= " .. tostring(burn_action))
    if burn_action then
        local user_address, pool, data, time_difference = findClosestLiquidityRemoveData(msg.Timestamp, token_sent_by)
        print("user_address= " .. user_address)
        print("token_sent_by= " .. token_sent_by)
        print("msg.From= " .. msg.From)
        print("amount_recieve= " .. tostring(amount_recieve))

        Send({
            Target = msg.From,
            Action = "Transfer",
            Recipient = user_address,
            Quantity = tostring(amount_recieve)
        })

        --   USERS_STAKE_TRACK[user_address][token_sent_by]["user_token_x"] = USERS_STAKE_TRACK[user_address][token_sent_by]
        -- ["user_token_x"] - tonumber(amount_recieve)
        -- USERS_STAKE_TRACK[user_address][token_sent_by]["user_token_y"] = USERS_STAKE_TRACK[user_address][token_sent_by]
        -- ["user_token_y"] - claim_tokenY_quantity
        updateTokenQuantity(user_address, token_sent_by, msg.From, tonumber(amount_recieve))
    end
end)

Handlers.add("Stake-User-Token", "Stake-User-Token", function(msg)
    local tokenX_address = msg.TokenXAdrress
    local tokenX_quantity = tonumber(msg.TokenXQuantity)
    local tokenY_address = msg.TokenYAdrress
    local tokenY_quantity = tonumber(msg.TokenYQuantity)
    local target_pool = msg.Pool
    local user_address = msg.User
    -- local total_lp_supply_in_pool = msg.TotalLPSupplyOfTargetPool
    -- local tokenX_reserve_in_pool = msg.TokenXReservePool
    -- local tokenY_reserve_in_pool = msg.TokenYReservePool
    print("--------------------------------")
    print("tokenX_address: " .. tostring(tokenX_address))
    print("tokenY_address: " .. tostring(tokenY_address))
    print("tokenX_quantity: " .. tostring(tokenX_quantity))
    print("tokenY_quantity: " .. tostring(tokenY_quantity))
    print("target_pool: " .. tostring(target_pool))
    print("user_address: " .. tostring(user_address))
    -- print("total_lp_supply_in_pool: " .. tostring(total_lp_supply_in_pool))
    -- print("tokenX_reserve_in_pool: " .. tostring(tokenX_reserve_in_pool))
    -- print("tokenY_reserve_in_pool: " .. tostring(tokenY_reserve_in_pool))
    print("--------------------------------")
    local dex_name = findDEXByPool(tokenX_address, tokenY_address, target_pool)
    if not dex_name then
        error("Pool not found in any DEX configuration")
    end
    print("Detected DEX: " .. dex_name)

    -- Initialize data structures (your existing code)
    if not USERS_BALANCE[user_address] then
        USERS_BALANCE[user_address] = {}
    end
    if not USERS_BALANCE[user_address][tokenX_address] then
        USERS_BALANCE[user_address][tokenX_address] = {
            address = tokenX_address,
            token = 0
        }
    end
    if not USERS_BALANCE[user_address][tokenY_address] then
        USERS_BALANCE[user_address][tokenY_address] = {
            address = tokenY_address,
            token = 0
        }
    end
    if not USERS_STAKE_TRACK[user_address] then
        USERS_STAKE_TRACK[user_address] = {}
    end
    if not USERS_STAKE_TRACK[user_address][target_pool] then
        USERS_STAKE_TRACK[user_address][target_pool] = {
            user_token_x = 0,
            user_token_y = 0
        }
    end

    -- Balance validation (your existing code)
    local total_staked_tokenX = getTotalStakedTokenAmount(user_address, tokenX_address)
    local total_staked_tokenY = getTotalStakedTokenAmount(user_address, tokenY_address)
    local user_balance_tokenX = tonumber(USERS_BALANCE[user_address][tokenX_address]["token"]) or 0
    local user_balance_tokenY = tonumber(USERS_BALANCE[user_address][tokenY_address]["token"]) or 0
    local staked_tokenX = tonumber(total_staked_tokenX) or 0
    local staked_tokenY = tonumber(total_staked_tokenY) or 0
    local required_tokenX = tonumber(tokenX_quantity) or 0
    local required_tokenY = tonumber(tokenY_quantity) or 0
    local available_tokenX = user_balance_tokenX - staked_tokenX
    local available_tokenY = user_balance_tokenY - staked_tokenY
    assert(available_tokenX >= required_tokenX, "Insufficient Token X balance")
    assert(available_tokenY >= required_tokenY, "Insufficient Token Y balance")

    -- Update stake tracking
    USERS_STAKE_TRACK[user_address][target_pool]["user_token_x"] = USERS_STAKE_TRACK[user_address][target_pool]
        ["user_token_x"] + required_tokenX
    USERS_STAKE_TRACK[user_address][target_pool]["user_token_y"] = USERS_STAKE_TRACK[user_address][target_pool]
        ["user_token_y"] + required_tokenY
    USERS_STAKE_TRACK[user_address][target_pool]["pool_address"] = target_pool
    USERS_STAKE_TRACK[user_address][target_pool]["token_x_address"] = tokenX_address
    USERS_STAKE_TRACK[user_address][target_pool]["token_y_address"] = tokenY_address
    USERS_STAKE_TRACK[user_address][target_pool]["dex_name"] = dex_name
    USERS_STAKE_TRACK[user_address][target_pool]["timestamp"] = msg.Timestamp
    if dex_name == "PERMASWAP" then
        -- **CRITICAL FIX: Use the handler's EXACT calculation logic**
        -- local reserveX = bint(tokenX_reserve_in_pool)
        -- local reserveY = bint(tokenY_reserve_in_pool)
        -- local totalLPSupply = bint(total_lp_supply_in_pool)
        -- local amountX = bint(required_tokenX)
        -- local amountY = bint(required_tokenY)

        -- -- **Method 1: Calculate using X as primary (mirrors handler logic)**
        -- local calculatedAmountY = bint.udiv(bint.__mul(amountX, reserveY), reserveX) + 1
        -- local liquidityFromX = bint.udiv(bint.__mul(amountX, totalLPSupply), reserveX)

        -- -- **Method 2: Calculate using Y as primary (mirrors handler logic)**
        -- local calculatedAmountX = bint.udiv(bint.__mul(amountY, reserveX), reserveY) + 1
        -- local liquidityFromY = bint.udiv(bint.__mul(calculatedAmountX, totalLPSupply), reserveX)

        -- -- **Choose the smaller liquidity amount (more conservative)**
        -- local finalLiquidity = liquidityFromX
        -- if bint.__lt(liquidityFromY, liquidityFromX) then
        --     finalLiquidity = liquidityFromY
        -- end

        -- -- **Apply generous slippage tolerance for higher success rate**
        -- local slippage_tolerance = 0.15  -- 15% buffer (more generous than 10%)
        -- local minLiquidity_float = tonumber(tostring(finalLiquidity)) * (1 - slippage_tolerance)
        -- local minLiquidity = tostring(bint(math.floor(minLiquidity_float)))

        -- print("Calculated liquidityFromX: " .. tostring(liquidityFromX))
        -- print("Calculated liquidityFromY: " .. tostring(liquidityFromY))
        -- print("Final expected liquidity: " .. tostring(finalLiquidity))
        -- print("MinLiquidity (85% of expected): " .. minLiquidity)
        -- **CRITICAL: Transfer tokens to the pool FIRST**
        print("----------------------------")
        print("token YT1 address " .. tokenX_address)
        print("token YT1 Amount " .. tostring(msg.TokenXQuantity))
        print("token YT2 address " .. tokenY_address)
        print("token YT2 address " .. tostring(msg.TokenYQuantity))
        print("----------------------------")
        Send({
            Target = tokenY_address,
            Action = "Transfer",
            Recipient = target_pool,
            Quantity = tostring(msg.TokenYQuantity)
        })

        -- Send({Target = ao.id, Action = "calling-tokenx-permaswap", TokenXAddress = tokenX_address,Pool = target_pool,Token_x_Quantity= tostring(msg.TokenXQuantity) })


        -- **Then call AddLiquidity with calculated MinLiquidity**
        -- Send({Target = target_pool, Action = "AddLiquidity", MinLiquidity = minLiquidity})
        ao.send({
            Target = msg.From,
            Data = require("json").encode({
                success = true
            })
        })
    else
        USERS_STAKE_TRACK[user_address][target_pool]["deposited_token_x_quantity"] = required_tokenX
        USERS_STAKE_TRACK[user_address][target_pool]["deposited_token_y_quantity"] = required_tokenY
        -- BOTEGA handling (your existing code)
        Send({
            Target = tokenX_address,
            Action = "Transfer",
            Recipient = target_pool,
            Quantity = tostring(required_tokenX),
            ['X-Action'] = "Provide",
            ["X-Slippage-Tolerance"] = tostring(50)
        })
        Send({
            Target = tokenY_address,
            Action = "Transfer",
            Recipient = target_pool,
            Quantity = tostring(required_tokenY),
            ['X-Action'] = "Provide",
            ["X-Slippage-Tolerance"] = tostring(50)
        })
        ao.send({
            Target = msg.From,
            Data = require("json").encode({
                success = true
            })
        })
    end
end)

Handlers.add("calling-tokenx-permaswap", "calling-tokenx-permaswap", function(msg)
    Send({
        Target = msg.TokenXAddress,
        Action = "Transfer",
        Recipient = msg.Pool,
        Quantity = msg.Token_x_Quantity
    })
end)

Handlers.add("adding-permaswap-liquidity", "adding-permaswap-liquidity", function(msg)
    Send({
        Target = msg.Pool,
        Action = "AddLiquidity",
        MinLiquidity = "1"
    })
end)

Handlers.add("LiquidityAdded-Notice", "LiquidityAdded-Notice", function(msg)
    local protocol_address = msg.User
    local target_pool = msg.From
    local deposited_tokenX_quantity = tonumber(msg.AmountX)
    local deposited_tokenY_quantity = tonumber(msg.AmountY)
    local permaswap_lp_minted = tonumber(msg.AmountLp)
    local refund_x = tonumber(msg.RefundX)
    local refund_y = tonumber(msg.RefundY)

    local user_address, pool, data, time_difference = findClosestStakeData(msg.Timestamp, target_pool)
    -- **THE FIX IS HERE**: Initialize the nested tables if they don't exist
    -- **FIX #2**: Initialize the stake tracking tables for THIS user.
    if not USERS_STAKE_TRACK[user_address] then
        USERS_STAKE_TRACK[user_address] = {}
    end
    if not USERS_STAKE_TRACK[user_address][target_pool] then
        -- Initialize with all necessary fields set to 0
        USERS_STAKE_TRACK[user_address][target_pool] = {
            pool_lp_token = 0,
            yielder_lp_token = 0,
            deposited_token_x_quantity = 0,
            deposited_token_y_quantity = 0
        }
    end


    -- Now it is safe to access and update the fields
    USERS_STAKE_TRACK[user_address][target_pool]["deposited_token_x_quantity"] = deposited_tokenX_quantity
    USERS_STAKE_TRACK[user_address][target_pool]["deposited_token_y_quantity"] = deposited_tokenY_quantity
    USERS_STAKE_TRACK[user_address][target_pool]["pool_lp_token"] = (USERS_STAKE_TRACK[user_address][target_pool]["pool_lp_token"] or 0) +
        permaswap_lp_minted
    if refund_x ~= 0 then
        Send({
            Target = msg.X,
            Action = "Transfer",
            Recipient = user_address,
            Quantity = tostring(refund_x)
        })
    end
    if refund_y ~= 0 then
        Send({
            Target = msg.Y,
            Action = "Transfer",
            Recipient = user_address,
            Quantity = tostring(refund_y)
        })
    end

    -- Mint and Transfer your project's LP token
    local yielder_lp_minted = Send({
        Target = ao.id,
        Action = "Mint",
        Quantity = tostring(permaswap_lp_minted)
    }).receive()
    local transfer_yielder_lp = Send({
        Target = ao.id,
        Action = "Transfer",
        Recipient = user_address,
        Quantity = tostring(permaswap_lp_minted)
    }).receive()
    USERS_STAKE_TRACK[user_address][target_pool]["yielder_lp_token"] = (USERS_STAKE_TRACK[user_address][target_pool]["yielder_lp_token"] or 0) +
        permaswap_lp_minted

    -- ao.send is non-blocking, so it's better than msg.reply here for sending confirmations
    ao.send({
        Target = user_address, -- Send confirmation to the user
        Data = require("json").encode({
            success = true,
            data = USERS_STAKE_TRACK[user_address][target_pool]
        })
    })
end)


Handlers.add("Track-User-Stake", "Track-User-Stake", function(msg)
    local user_address = msg.User
    ao.send({
        Target = msg.From,
        Data = require("json").encode(USERS_STAKE_TRACK[user_address])
    })
end)


-----------------------------------------------------------------------------------------------------------------------------------------------------------

function remove_liquidity(user, lp_token, target_pool, tokenX_address, tokenY_address, tokenX_amount, tokenY_amount)
    -- This function now correctly handles both DEX types
    local dex_name = findDEXByPool(tokenX_address, tokenY_address, target_pool)

    -- **FIX #2**: Corrected variable name from 'user_address' to 'user' in this block.
    if USERS_STAKE_TRACK[user] and USERS_STAKE_TRACK[user][target_pool] and USERS_STAKE_TRACK[user][target_pool]["pool_lp_token"] >= lp_token then
        print("dex_name: " .. dex_name)
        if dex_name == "PERMASWAP" or USERS_STAKE_TRACK[user][target_pool]["dex_name"] == "PERMASWAP" then
            print("checkkkk")
            Send({
                Target = target_pool,
                Action = "RemoveLiquidity",
                MinX = tostring(tokenX_amount),
                MinY = tostring(tokenY_amount),
                Quantity = tostring(lp_token)
            })
        elseif dex_name == "BOTEGA" then
            Send({ Target = target_pool, Action = "Burn", Quantity = tostring(lp_token) })
        end

        -- Update the user's stake track after sending the removal command
        USERS_STAKE_TRACK[user][target_pool]["pool_lp_token"] = USERS_STAKE_TRACK[user][target_pool]["pool_lp_token"] -
            lp_token
        USERS_STAKE_TRACK[user][target_pool]["yielder_lp_token"] = USERS_STAKE_TRACK[user][target_pool]
            ["yielder_lp_token"] - lp_token
    else
        print("Remove liquidity failed: Insufficient stake or no record found for user " ..
            user .. " in pool " .. target_pool)
    end
end

Handlers.add("LiquidityRemoved-Notice", "LiquidityRemoved-Notice", function(msg)
    local protocol_address = msg.User
    local target_pool = msg.From
    local claim_tokenX_quantity = tonumber(msg.AmountX)
    local claim_tokenY_quantity = tonumber(msg.AmountY)
    local permaswap_lp_removed = tonumber(msg.AmountLp)
    local permaswap_lp_remain = tonumber(msg.BalanceLp)
    local tokenX_address = msg.X
    local tokenY_address = msg.Y


    local user_address, pool, data, time_difference = findClosestLiquidityRemoveData(msg.Timestamp, target_pool)


    Send({
        Target = tokenX_address,
        Action = "Transfer",
        Recipient = user_address,
        Quantity = tostring(
            claim_tokenX_quantity)
    })

    Send({
        Target = tokenY_address,
        Action = "Transfer",
        Recipient = user_address,
        Quantity = tostring(
            claim_tokenY_quantity)
    })


    --     USERS_STAKE_TRACK[user_address][target_pool]["user_token_x"] = USERS_STAKE_TRACK[user_address][target_pool]["user_token_x"] + required_tokenX
    --     USERS_STAKE_TRACK[user_address][target_pool]["user_token_y"] = USERS_STAKE_TRACK[user_address][target_pool]["user_token_y"] + required_tokenY
    --     USERS_STAKE_TRACK[user_address][target_pool]["pool_address"] = target_pool
    --     USERS_STAKE_TRACK[user_address][target_pool]["token_x_address"] = tokenX_address
    --     USERS_STAKE_TRACK[user_address][target_pool]["token_y_address"] = tokenY_address
    --     USERS_STAKE_TRACK[user_address][target_pool]["dex_name"] = dex_name
    -- 	USERS_STAKE_TRACK[user_address][target_pool]["timestamp"] = msg.Timestamp
    --  -- Now it is safe to access and update the fields
    -- 	USERS_STAKE_TRACK[user_address][target_pool]["deposited_token_x_quantity"] = deposited_tokenX_quantity
    -- 	USERS_STAKE_TRACK[user_address][target_pool]["deposited_token_y_quantity"] = deposited_tokenY_quantity
    -- 	USERS_STAKE_TRACK[user_address][target_pool]["pool_lp_token"] = (USERS_STAKE_TRACK[user_address][target_pool]["pool_lp_token"] or 0) + permaswap_lp_minted
    -- 	USERS_STAKE_TRACK[user_address][target_pool]["yielder_lp_token"] = (USERS_STAKE_TRACK[user_address][target_pool]["yielder_lp_token"] or 0) + permaswap_lp_minted


    USERS_STAKE_TRACK[user_address][target_pool]["user_token_x"] = USERS_STAKE_TRACK[user_address][target_pool]
        ["user_token_x"] - claim_tokenX_quantity
    USERS_STAKE_TRACK[user_address][target_pool]["user_token_y"] = USERS_STAKE_TRACK[user_address][target_pool]
        ["user_token_y"] - claim_tokenY_quantity
end)



----------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Global flag to prevent re-entrancy
USER_RUNNING_YIELD_OPTIMIZER = false

-- Function to find best pool for specific token pair
function findBestPoolForTokenPair(poolsData, tokenA, tokenB)
    local matchingPools = {}

    -- Find all pools with the same token pair
    for dexName, pools in pairs(poolsData) do
        for poolAddress, poolData in pairs(pools) do
            if poolData.tvl and poolData.tvl > 0 and poolData.apr then
                -- Check if tokens match (either A-B or B-A order)
                if (poolData.tokenA == tokenA and poolData.tokenB == tokenB) or
                    (poolData.tokenA == tokenB and poolData.tokenB == tokenA) then
                    table.insert(matchingPools, poolData)
                end
            end
        end
    end

    if #matchingPools == 0 then return nil end

    -- Sort by APR (highest first)
    table.sort(matchingPools, function(a, b) return a.apr > b.apr end)

    local bestPool = matchingPools[1]

    -- Apply TVL safety check
    if bestPool.tvl < 1000 and #matchingPools > 1 then
        for i = 2, math.min(5, #matchingPools) do
            local candidate = matchingPools[i]
            if candidate.apr >= bestPool.apr * 0.8 and candidate.tvl > bestPool.tvl * 3 then
                bestPool = candidate
                break
            end
        end
    end

    return bestPool
end

-- Main yield optimization function
function optimizeUserYieldsTokenSpecific(msg)
    -- Prevent re-entrancy
    if USER_RUNNING_YIELD_OPTIMIZER then
        return
    end
    USER_RUNNING_YIELD_OPTIMIZER = true

    print("Starting token-pair-specific yield optimization...")

    -- Safety check for data availability
    if not CRONDATAPOOL or not USERS_STAKE_TRACK then
        print("No pool data or user stakes available")
        USER_RUNNING_YIELD_OPTIMIZER = false
        return
    end

    -- Analyze each user's positions
    for user_address, user_pools in pairs(USERS_STAKE_TRACK) do
        for current_pool_address, stake_data in pairs(user_pools) do
            -- Skip if no valid stake data
            if not stake_data or not stake_data.dex_name or
                not stake_data.token_x_address or not stake_data.token_y_address then
                goto continue_pool
            end

            -- Find current pool's performance in CRONDATAPOOL
            local current_pool_data = nil
            if CRONDATAPOOL[stake_data.dex_name] and
                CRONDATAPOOL[stake_data.dex_name][current_pool_address] then
                current_pool_data = CRONDATAPOOL[stake_data.dex_name][current_pool_address]
            end

            if not current_pool_data then
                print("Current pool data not found for: " .. current_pool_address)
                goto continue_pool
            end

            local current_apr = current_pool_data.apr or 0
            local current_tvl = current_pool_data.tvl or 0

            print("Analyzing user " .. user_address .. " in pool " .. current_pool_address)
            print("Current APR: " .. current_apr .. "%, TVL: $" .. current_tvl)
            print("Token pair: " .. stake_data.token_x_address .. " / " .. stake_data.token_y_address)

            -- **KEY FIX: Find best pool for SAME token pair only**
            local bestPoolForPair = findBestPoolForTokenPair(
                CRONDATAPOOL,
                stake_data.token_x_address,
                stake_data.token_y_address
            )

            if not bestPoolForPair then
                print("No other pools found for this token pair")
                goto continue_pool
            end

            print("Best pool for this token pair: " .. bestPoolForPair.poolAddress ..
                " with APR: " .. bestPoolForPair.apr .. "%")

            -- Check if best pool is significantly better (15% improvement threshold)
            local improvement_threshold = 1.15 -- 15% better APR required
            local min_tvl_threshold = 1000     -- Minimum $1000 TVL required

            if bestPoolForPair.apr > (current_apr * improvement_threshold) and
                bestPoolForPair.tvl > current_tvl and
                bestPoolForPair.poolAddress ~= current_pool_address then
                print("Better pool found! Moving user from " .. current_pool_address ..
                    " to " .. bestPoolForPair.poolAddress)
                print("APR improvement: " .. current_apr .. "% -> " .. bestPoolForPair.apr .. "%")
                print("Same token pair: " .. stake_data.token_x_address .. " / " .. stake_data.token_y_address)

                -- Extract user's current stake amounts
                local user_token_x = stake_data.user_token_x or 0
                local user_token_y = stake_data.user_token_y or 0
                local user_lp_tokens = stake_data.pool_lp_token or stake_data.yielder_lp_token or 0

                if user_lp_tokens > 0 then
                    -- Step 1: Remove/Burn liquidity from current pool
                    if stake_data.dex_name == "PERMASWAP" then
                        Send({
                            Target = current_pool_address,
                            Action = "RemoveLiquidity",
                            MinX = "1",
                            MinY = "1",
                            Quantity = tostring(user_lp_tokens)
                        })
                    elseif stake_data.dex_name == "BOTEGA" then
                        Send({
                            Target = current_pool_address,
                            Action = "Burn",
                            Quantity = tostring(user_lp_tokens)
                        })
                    end

                    -- Step 2: Add liquidity to best pool (same token pair)
                    if bestPoolForPair.dexName == "PERMASWAP" then
                        -- Transfer tokens to new pool first
                        Send({
                            Target = stake_data.token_x_address,
                            Action = "Transfer",
                            Recipient = bestPoolForPair.poolAddress,
                            Quantity = tostring(user_token_x)
                        })
                        Send({
                            Target = stake_data.token_y_address,
                            Action = "Transfer",
                            Recipient = bestPoolForPair.poolAddress,
                            Quantity = tostring(user_token_y)
                        })

                        -- Add liquidity to new pool
                        Send({
                            Target = bestPoolForPair.poolAddress,
                            Action = "AddLiquidity",
                            MinLiquidity = "1"
                        })
                    elseif bestPoolForPair.dexName == "BOTEGA" then
                        -- Transfer tokens to BOTEGA pool
                        Send({
                            Target = stake_data.token_x_address,
                            Action = "Transfer",
                            Recipient = bestPoolForPair.poolAddress,
                            Quantity = tostring(user_token_x),
                            ['X-Action'] = "Provide",
                            ["X-Slippage-Tolerance"] = tostring(50)
                        })
                        Send({
                            Target = stake_data.token_y_address,
                            Action = "Transfer",
                            Recipient = bestPoolForPair.poolAddress,
                            Quantity = tostring(user_token_y),
                            ['X-Action'] = "Provide",
                            ["X-Slippage-Tolerance"] = tostring(50)
                        })
                    end

                    -- Step 3: Update user's stake tracking
                    -- Remove old pool entry
                    USERS_STAKE_TRACK[user_address][current_pool_address] = nil

                    -- Create new pool entry
                    if not USERS_STAKE_TRACK[user_address][bestPoolForPair.poolAddress] then
                        USERS_STAKE_TRACK[user_address][bestPoolForPair.poolAddress] = {}
                    end

                    -- Update with new pool data (same tokens, new pool)
                    USERS_STAKE_TRACK[user_address][bestPoolForPair.poolAddress] = {
                        user_token_x = user_token_x,
                        user_token_y = user_token_y,
                        pool_address = bestPoolForPair.poolAddress,
                        token_x_address = stake_data.token_x_address, -- Same tokens
                        token_y_address = stake_data.token_y_address, -- Same tokens
                        dex_name = bestPoolForPair.dexName,
                        timestamp = msg.Timestamp,
                        pool_lp_token = 0, -- Will be updated by LiquidityAdded-Notice
                        yielder_lp_token = 0,
                        deposited_token_x_quantity = user_token_x,
                        deposited_token_y_quantity = user_token_y
                    }

                    print("Successfully moved user " .. user_address ..
                        " to better pool with SAME token pair!")

                    -- Only move to one better pool per user per run
                    break
                end
            else
                print("Current pool is already optimal for this token pair or improvement not significant enough")
            end

            ::continue_pool::
        end
    end

    USER_RUNNING_YIELD_OPTIMIZER = false
    print("Token-pair-specific yield optimization completed.")
end

-- Handler that runs automatically
Handlers.add("Auto-Token-Pair-Yield-Optimizer", "Auto-Token-Pair-Yield-Optimizer", function(msg)
    optimizeUserYieldsTokenSpecific(msg)

    -- Send confirmation back
    ao.send({
        Target = msg.From,
        Data = require("json").encode({
            success = true,
            message = "Token-pair-specific yield optimization completed",
            timestamp = msg.Timestamp
        })
    })
end)


-- Optional: Handler for manual trigger (for testing)
Handlers.add("Manual-Yield-Check", "Manual-Yield-Check", function(msg)
    print("Manual yield optimization triggered")
    optimizeUserYields()
end)






-- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

-- Send({ Target = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "Stake-User-Token", Pool = "Q9uyLNaNvuFHvNrQQZ_XuOrRZ6OEE0KqSEPJJj8Z4Ys", User = "nnrvrgmIuvaV5x1DdUcHnbjRG--WSXtgVAY_bEYGqIs", TokenXAdrress ="_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU", TokenXQuantity = "2000000000000",  TokenYAdrress ="Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc", TokenYQuantity = "2727272727272"})

-- Send({Target="Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc",Action = "Transfer", Recipient="SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Quantity="2727272727272"})

-- Send({Target="_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU",Action = "Transfer", Recipient="SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Quantity="2000000000000"})


-- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


-- -- wallet to process
-- Send({ Target = "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc", Action = "Transfer", Recipient ="SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Quantity = "2000000000000" })

-- Send({ Target = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU", Action = "Transfer", Recipient ="SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Quantity = "2307692307692" })


-- -- 30-40 sec       Stake-User-Token
-- Send({ Target = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "Stake-User-Token", Pool ="3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w", User = "nnrvrgmIuvaV5x1DdUcHnbjRG--WSXtgVAY_bEYGqIs", TokenXAdrress ="_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU", TokenXQuantity = "2307692307692", TokenYAdrress ="Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc", TokenYQuantity = "2000000000000" })


-- -- 40 sec          calling-tokenx-permaswap
-- Send({ Target = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "calling-tokenx-permaswap", TokenXAddress ="_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU", Pool = "3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w", Token_x_Quantity ="2307692307692" })


-- -- 40 sec          adding-permaswap-liquidity
-- Send({ Target = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "adding-permaswap-liquidity", Pool ="3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w" })

-- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


-- Send({ Target = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "Burn", Pool ="3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w",TokenXAddress = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU", TokenXQuantity="1" , TokenYAddress= "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc", TokenYQuantity = "1", User="nnrvrgmIuvaV5x1DdUcHnbjRG--WSXtgVAY_bEYGqIs", Quantity = "1000000000000"})


-- Send({ Target = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "Burn", Pool ="Q9uyLNaNvuFHvNrQQZ_XuOrRZ6OEE0KqSEPJJj8Z4Ys",TokenXAddress = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU", TokenXQuantity="1" , TokenYAddress= "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc", TokenYQuantity = "1", User="nnrvrgmIuvaV5x1DdUcHnbjRG--WSXtgVAY_bEYGqIs", Quantity = "1010880878994"})

-- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



-- SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys
