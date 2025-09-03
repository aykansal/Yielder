 msg.reply ({
                TimeStamp = tostring(msg.Timestamp),
                Action = 'LiquidityAdded-Notice',
                User = msg.From,
                Result = 'ok',
                Pool = Name,
                PoolId = ao.id,
                AddLiquidityTx = msg.Id,
                X = Pool.X,
                Y = Pool.Y,
                AmountX = Px,
                AmountY = Py,
                RefundX = '0',
                RefundY = '0',
                AmountLp = Px,
                BalanceLp = Balances[msg.From] or '0',
                TotalSupply = TotalSupply,
                Data = 'Liquidity added',

                -- Assignments = Mining,
            })


             msg.reply ({
                    TimeStamp = tostring(msg.Timestamp),
                    Action = 'LiquidityAdded-Notice',
                    User = msg.From,
                    Result = 'ok',
                    Pool = Name,
                    PoolId = ao.id,
                    AddLiquidityTx = msg.Id,
                    X = Pool.X,
                    Y = Pool.Y,
                    AmountX = tostring(amountX),
                    AmountY = tostring(amountY),
                    RefundX = '0',
                    RefundY = refundY,
                    AmountLp = tostring(liquidityMinted),
                    BalanceLp = Balances[msg.From] or '0',
                    TotalSupply = TotalSupply,
                    Data = 'Liquidity added',

                    -- Assignments = Mining,
                })
                

                  msg.reply ({
                    TimeStamp = tostring(msg.Timestamp),
                    Action = 'LiquidityAdded-Notice',
                    User = msg.From,
                    Result = 'ok',
                    Pool = Name,
                    PoolId = ao.id,
                    AddLiquidityTx = msg.Id,
                    X = Pool.X,
                    Y = Pool.Y,
                    AmountX = tostring(amountX),
                    AmountY = tostring(amountY),
                    RefundX = refundX,
                    RefundY = '0',
                    AmountLp = tostring(liquidityMinted),
                    BalanceLp = Balances[msg.From] or '0',
                    TotalSupply = TotalSupply,
                    Data = 'Liquidity added',

                    -- Assignments = Mining,
                })