В форме /chat хочу сделать:
1. в выпадающем списке "type" переименовать label на "message type"
2. если в выпадающем списке "type" выбрано "user", то
в memo ниже label меняется на "Enter your request (user message) here..."; если в выпадающем списке "type" выбрано "system", то
в memo ниже label меняется на "Enter your request (system message) here..."
3. При этом два сообщения сохраняются в localStorare под ключами "message.user" и "message.system", ну и сам memo переключается между двумя этии сообщениями
4. кнопка "send" посылает сообщение на API post.promt (message.user, message.system, format, options, выбранная модель)
5. полученный ответ (не важно - ошибка или хороший результат) - выводит в memo внизу - или ошибка или result.data. Фон меняется как форме, например, "format response".
