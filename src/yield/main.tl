
local sqlite3 = require('lsqlite3')
local dbAdminnn = require("utils.utils.dbAdmin")
require("utils.globals")

DB = DB or sqlite3.open_memory()
if not DB then
  print("Failed to open database")
  return
end
dbAdmin = dbAdminnn.new(DB)



require("yield.handlers.pool")






