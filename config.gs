const CONFIG = {

    // API Key of openweathermap.org
    'API_KEY': "*****",

    // 都市名を指定
    // 有効な都市名は city.list.json.gz をダウンロードして確認
    // https://openweathermap.org/current?collection=current_forecast&collection=current_forecast&collection=current_forecast&collection=current_forecast#cityid
    'CITY': "Tokyo",

    // 追加先カレンダーIDを指定
    // 自分のメインカレンダーを指定する場合は `primary`
    /*
    カレンダーID は以下で確認可能
    1. Googleカレンダーを開く
    2. 左のカレンダー一覧
    3. 対象カレンダー → ︙
    4. 設定と共有
    5. カレンダーの統合
    6. カレンダーID
    */
    'CALENDAR_ID': "primary", //todo このカレンダーのアクセススコープ
}
