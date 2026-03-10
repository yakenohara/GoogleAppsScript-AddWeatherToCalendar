function addWeatherToCalendar() {

    // 「Built-in API request by city name」 によるリクエスト url を作成
    // https://openweathermap.org/current?collection=current_forecast&collection=current_forecast&collection=current_forecast&collection=current_forecast#name
    // レスポンスのフォーマット形式は JSON 形式 (`mode` オプション = default) レスポンス内容は以下参照
    // https://openweathermap.org/forecast5?collection=current_forecast&collection=current_forecast&collection=current_forecast#fields_JSON
    const str_url =
        "https://api.openweathermap.org/data/2.5/forecast?q="
        + CONFIG.CITY +
        "&units=metric&appid=" + CONFIG.API_KEY
    ;

    // URL からリクエスト
    // https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app?hl=ja
    const HTTPResponse_response = UrlFetchApp.fetch(str_url);
    const obj_forecastData = JSON.parse(HTTPResponse_response.getContentText()); // リクエスト結果文字列を Object 化

    // カレンダー ID を元に追加咲のカレンダーを取得
    // https://developers.google.com/apps-script/reference/calendar/calendar-app?hl=ja#getCalendarById(String)
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);

    // 日毎予報データの時間毎予報データの組立
    var obj_dailyForecaast = {}; // 日毎予報データ
    for(var int_idxOfList = 0 ; int_idxOfList < obj_forecastData.list.length ; int_idxOfList++){
        var obj_itemOfList = obj_forecastData.list[int_idxOfList]; // 時間毎予報データ
    
        var date_forecastTime = new Date(obj_itemOfList.dt * 1000); //todo UTC -> 地域時刻修正
        var str_dateStringToday = `${date_forecastTime.getFullYear()}-${date_forecastTime.getMonth()}-${date_forecastTime.getDate()}`; // 日付のみを表す文字列

        if(!(str_dateStringToday in obj_dailyForecaast)){ // 処理中の日付が日毎予報データに存在しない場合
            obj_dailyForecaast[str_dateStringToday] = {
                'weather': { // `list.weather` を日単位にまとめた情報
                    'id': '',
                    'main': '',
                    //todo list.weather.description
                    //todo list.weather.icon
                },
                'list_dtsorted': [], // `list.dt` の値でソートされた `list` の要素
            }
        }

        // 日毎予報データ -> 時間毎予報データ配列に追加
        var int_idx = 0;
        for(int_idx = (obj_dailyForecaast[str_dateStringToday].list_dtsorted.length - 1) ; 0 <= int_idx ; int_idx--){ // 配列代入先要素番号の検索
            if (obj_dailyForecaast[str_dateStringToday].list_dtsorted[int_idx].dt < obj_itemOfList.dt){
                break;
            }
        }
        obj_dailyForecaast[str_dateStringToday].list_dtsorted.splice((int_idx + 1), 0, obj_itemOfList); // 日毎予報データに時間毎予報データを参照コピー
    }

    // 日毎の天気を算出
    Object.entries(obj_dailyForecaast).forEach(([str_key, obj_value]) => {
        obj_value.weather.main = obj_value.list_dtsorted[0].weather[0].main; //todo その日を代表する天気を算出
    });
    
    
    // 日毎予報データをカレンダーに登録
    Object.entries(obj_dailyForecaast).forEach(([str_key, obj_value]) => {
        
        const str_title = 
            "" + obj_value.weather.main
        ;

        // カレンダーにイベント登録
        const strarr_datetmp = str_key.split('-');
        const date_forecastDay = new Date(parseInt(strarr_datetmp[0]), parseInt(strarr_datetmp[1]), parseInt(strarr_datetmp[2])); // 00:00 を表す Date を作成 //todo 日本標準時になるのはなぜ
        const date_forecastDay_next = new Date(date_forecastDay.getFullYear(), date_forecastDay.getMonth(), (date_forecastDay.getDate() + 1));

        // 既存のイベント検索
        // https://developers.google.com/apps-script/reference/calendar/calendar?hl=ja#getEvents(Date,Date)
        const CalendarEventarr_events = calendar.getEvents(date_forecastDay, date_forecastDay_next);

        if(0 < CalendarEventarr_events.length){ // 既存のイベントが存在する場合 //todo 暫定処理。1日1イベントのみ扱うカレンダーを想定
            // 複数イベントと扱う場合は、以下のように検索
            // for (var i = 0; i < CalendarEventarr_events.length; i++) {
            //     if (CalendarEventarr_events[i].isAllDayEvent() && CalendarEventarr_events[i].getTitle().startsWith("天気: ")) {
            //         CalendarEvent_toChageEvent = CalendarEventarr_events[i];
            //         break;
            //     }
            // }
            CalendarEventarr_events[0].setTitle(str_title);
        
        }else{ // 既存のイベントが存在しない場合
            calendar.createAllDayEvent(str_title, date_forecastDay, date_forecastDay_next);
        }
    
    });
}
