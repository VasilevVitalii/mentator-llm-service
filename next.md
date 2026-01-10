main

POST /promt -> POST /prompt

state

GET /api/version -> GET /state/version
GET /api/models -> GET /state/models
GET /api/statdata -> /state

validation

POST /api/checkformat -> POST /check/gbnf (проверяет JSON схему, затем GBNF)
POST /api/checkoptions -> POST /check/options
+ новый POST /check/jsonresponse (проверяет только JSON схему)

helper

GET /api/example/format -> GET helper/example/jsonresponse
GET /api/example/options -> GET helper/example/options
GET /api/example/optionsjson -> GET helper/example/optionsjson
POST /api/promtload -> POST helper/converter/promtFormat/fromstring
POST /api/promtstore -> POST helper/converter/promtFormat/tostring

log

GET /api/corelogs -> GET /log/core/byid
POST /api/corelogs/download -> GET /log/core/bydate - тут два параметра - дата (обязательный) и час (необязательный)
GET /api/chatlogs -> GET /log/chat/byid
POST /api/chatlogs/download -> GET /log/chat/bydate - тут два параметра - дата (обязательный) и час (необязательный)

pages

GET /
GET /stat
GET /chat
GET /log/core
GET /log/chat





