
-- Add this handler to process cron messages
Handlers.add(
  "CronTick", -- handler name
  Handlers.utils.hasMatchingTag("Action", "Cron"), -- handler pattern to identify cron message
  function (msg) -- handler task to execute on cron message
   
   Send({Target="SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action="cronnn"})
  end
)