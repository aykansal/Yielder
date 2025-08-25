PRICE_FEED_URL = 'https://api.blockchain.info/stats'

Handlers.add("Best-Stake", "Best-Stake", function(msg)
 

    print("Best stake handler called")

    send({
         target = id,
        ['relay-path'] = PRICE_FEED_URL,
        ['TokenX'] = TokenX, 
        ['TokenY'] = TokenY,
        resolve = '~relay@1.0/call/~patch@1.0',
        action = 'Handling-Best-Stake'
    })

    print("Calling ayush ahndler")
end)


-- yHLZjxtEBvhDcogFYAd3LCAuFDnlDK0f4CNlykFLtc0


Handlers.add('Handling-Best-Stake', 'Handling-Best-Stake', function(msg)
    print("333333333333333333333333333333")

    if msg.body then
 
        local PRICE_FEED = require('json').decode(msg.body)



        send({target="aPbLwv3daFtcPEgkH0lqgmcJQudaogBjHOOSTxNoyJY",
    action= "pop",
data =require('json').encode(PRICE_FEED) })

 
    end
end)


