//
// 登録済みのカレンダーのイベントを削除する (デバッグ用)
// openweathermap.org の API が返す期間分のカレンダーイベントを削除する
function clearEventsFromCalendar() {

    // 「Built-in API request by city name」 によるリクエスト url を作成
    const str_url =
        "https://api.openweathermap.org/data/2.5/forecast?q="
        + CONFIG.CITY +
        "&units=metric&appid=" + CONFIG.API_KEY
    ;

    // URL からリクエスト
    const HTTPResponse_response = UrlFetchApp.fetch(str_url);
    const obj_forecastData = JSON.parse(HTTPResponse_response.getContentText()); // リクエスト結果文字列を Object 化

    // カレンダー ID を元に追加咲のカレンダーを取得
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);

    // 日毎予報データの時間毎予報データの組立
    var obj_dailyForecast = {}; // 日毎予報データ
    for(var int_idxOfList = 0 ; int_idxOfList < obj_forecastData.list.length ; int_idxOfList++){
        var obj_itemOfList = obj_forecastData.list[int_idxOfList]; // 時間毎予報データ

        var date_forecastTime = new Date((obj_itemOfList.dt + obj_forecastData.city.timezone) * 1000); // タイムゾーンと UTC 時刻差分を考慮した Date -> getUTC~() でタイムゾーンを考慮した日時を取得する目的
        var str_dateStringToday = `${date_forecastTime.getUTCFullYear()}-${date_forecastTime.getUTCMonth()}-${date_forecastTime.getUTCDate()}`; // 日付のみを表す文字列

        if(!(str_dateStringToday in obj_dailyForecast)){ // 処理中の日付が日毎予報データに存在しない場合
            obj_dailyForecast[str_dateStringToday] = {
                'list_dtsorted': [], // `list.dt` の値でソートされた `list` の要素
            }
        }

        // 日毎予報データ -> 時間毎予報データ配列に追加
        var int_idx = 0;
        for(int_idx = (obj_dailyForecast[str_dateStringToday].list_dtsorted.length - 1) ; 0 <= int_idx ; int_idx--){ // 配列代入先要素番号の検索
            if (obj_dailyForecast[str_dateStringToday].list_dtsorted[int_idx].dt < obj_itemOfList.dt){
                break;
            }
        }
        obj_dailyForecast[str_dateStringToday].list_dtsorted.splice((int_idx + 1), 0, obj_itemOfList); // 日毎予報データに時間毎予報データを参照コピー
    }

    // 日毎予報データをカレンダーに登録
    Object.entries(obj_dailyForecast).forEach(([str_key, obj_value]) => {

        // カレンダーにイベント登録
        const strarr_datetmp = str_key.split('-');
        const date_forecastDay = new Date((parseInt((Date.UTC(parseInt(strarr_datetmp[0]), parseInt(strarr_datetmp[1]), parseInt(strarr_datetmp[2]))) / 1000) - obj_forecastData.city.timezone) * 1000); // 00:00 を表す Date を作成
        const date_forecastDay_next = new Date(date_forecastDay.getTime() + (86400 * 1000)); // 次の日の 00:00 を表す Date を作成

        // 既存のイベント検索して削除
        const CalendarEventarr_events = calendar.getEvents(date_forecastDay, date_forecastDay_next);
        CalendarEventarr_events.forEach(CalendarEventarr_event => {
            // イベントの削除
            // https://developers.google.com/apps-script/reference/calendar/calendar?hl=ja#getEvents(Date,Date)
            CalendarEventarr_event.deleteEvent();
        });

    });
}
