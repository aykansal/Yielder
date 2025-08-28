local bint = require('.bint')(256)
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

    Balances[msg.From] = utils.subtract(Balances[msg.From], msg.Tags.Quantity)
    TotalSupply = utils.subtract(TotalSupply, msg.Tags.Quantity)
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


------------------------------------------------------------------------------------------------------------------------

HISTORICAL_RESERVES = HISTORICAL_RESERVES or {}

YT1 = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU"
YT2 = "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc"
YT3 = "CgD7STeX0_VDlNwNnB4_qQLg4nb4okqXQgTki0sFXSM"

local POOL = {
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

function findBestPool()
    local allPools = {}

    -- Collect all pools into a single array
    for dexName, pools in pairs(DATA_POOL) do
        for poolAddress, poolData in pairs(pools) do
            if poolData.tvl > 0 then -- Only consider pools with valid TVL
                table.insert(allPools, poolData)
            end
        end
    end

    if #allPools == 0 then return nil end

    -- Sort by APR (highest first)
    table.sort(allPools, function(a, b) return a.apr > b.apr end)

    -- Apply selection logic based on APR and TVL
    local bestPool = allPools[1] -- Start with highest APR

    -- If top pool has very low TVL (< $1000), consider the next best with higher TVL
    if bestPool.tvl < 1000 and #allPools > 1 then
        for i = 2, math.min(5, #allPools) do
            local candidate = allPools[i]
            -- Choose if APR is still competitive (within 20% of best) and TVL is significantly higher
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

-- Timestamp to datetime converter that returns structured data for calculations
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
        print("  - First time seeing pool. Initializing history structure for " .. poolAddress)
        HISTORICAL_RESERVES[poolAddress] = {
            history = {},
            latest_reserve = {}
        }
    end

    print("HISTORICAL_RESERVES = " .. require("json").encode(HISTORICAL_RESERVES[poolAddress]))

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

    print("poolDataHistory = " .. require("json").encode(poolDataHistory))


    local today = timestamp_to_datetime(currentTimestamp)
    local yesterday = timestamp_to_datetime(currentTimestamp - 86400)

    local yesterdays_last_entry = nil
    local latest_yesterday_timestamp = 0

    print("today = " .. require("json").encode(today))
    print("yesterday = " .. require("json").encode(yesterday))
    print("yesterdays_last_entry_0 = " .. require("json").encode(yesterdays_last_entry))
    print("latest_yesterday_timestamp_0 = " .. tostring(latest_yesterday_timestamp))

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

    print("yesterdays_last_entry_1 = " .. require("json").encode(yesterdays_last_entry))
    print("latest_yesterday_timestamp_1 = " .. require("json").encode(latest_yesterday_timestamp))

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
        print("yesterdays_last_entry_2 = " .. require("json").encode(yesterdays_last_entry))
        print("latest_yesterday_timestamp_2 = " .. require("json").encode(latest_yesterday_timestamp))
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
        print("yesterdays_last_entry_3 = " .. require("json").encode(yesterdays_last_entry))
        print("latest_yesterday_timestamp_3 = " .. require("json").encode(latest_yesterday_timestamp))
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

    print("filtered_history = " .. require("json").encode(filtered_history))
    print("past_data_was_found = " .. require("json").encode(past_data_was_found))

    poolDataHistory.history = filtered_history

    print("poolDataHistory.history = " .. require("json").encode(poolDataHistory.history))


    -- 4. Conditionally insert the new entry
    if yesterdays_last_entry and past_data_was_found then
        print("Conditions met: Inserting new entry.")
        table.insert(poolDataHistory.history, poolDataHistory.latest_reserve)
    end

    print("poolDataHistory.history = " .. require("json").encode(poolDataHistory.history))


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
                print("Yesterday's entry was pruned. Re-inserting it.")
                table.remove(pruned_loll, 15)                    -- Remove the oldest of the top 15
                table.insert(pruned_loll, yesterdays_last_entry) -- Add it back
            end
        end
        print("pruned_loll = " .. require("json").encode(pruned_loll))
        poolDataHistory.history = pruned_loll
    end

    -- Only returns a value if old and current are from different days
    function calculate_reserve_change(old_reserve, current_reserve)
        if old_reserve == nil or current_reserve == nil then
            return 0
        end
        return math.abs(current_reserve - old_reserve)
    end

    print("yesterdays_last_entry = " .. require("json").encode(yesterdays_last_entry))
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

-------------------------------------------------------------------------------------------------------------

DATA_POOL = {}
CRONDATAPOOL = {}
USER_RUNNING_HANDLER = false
Send({
    Target = "aPbLwv3daFtcPEgkH0lqgmcJQudaogBjHOOSTxNoyJY",
    Action = "Best-Stake",
    TokenX =
    "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU",
    TokenY = "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc"
})

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
    local TokenX = msg.TokenX
    local TokenY = msg.TokenY

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
                poolData.volume24h = estimate24hVolume(address, currentReserves, current_timestamp)
                print("volume calculated")
                poolData.apr = calculateAPR(poolData.volume24h, poolData.fee, poolData.tvl)

           
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
    local bestPool = findBestPool()
    msg.reply({ Data = require("json").encode(bestPool) })
end)

-------------------------------------------------------------------------------------------------------------

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

                ao.send({ Target = msg.From, Data = require("json").encode(poolData) })
            else
                print("    No TagArray found for pool: " .. address)
            end
        end
    end

    print("CRON data collection completed for all token pairs")
end)
