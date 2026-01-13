validation

POST /api/checkformat -> POST /check/gbnf (проверяет JSON схему, затем GBNF)
POST /api/checkoptions -> POST /check/options
добавить новый POST /check/jsonresponse (проверяет только JSON схему)

log

POST /api/corelogs/download -> GET /log/core/bydate - тут два параметра - дата (обязательный) и час (необязательный)
POST /api/chatlogs/download -> GET /log/chat/bydate - тут два параметра - дата (обязательный) и час (необязательный)






