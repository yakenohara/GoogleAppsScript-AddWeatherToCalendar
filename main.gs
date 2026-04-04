//
// 天気予報をカレンダーイベントとして追加する
// openweathermap から天気予報を取得して、日毎に天気予報を求め、カレンダーイベントとして追加する
//
function addWeatherToCalendar() {

    // 「Built-in API request by city name」 によるリクエスト url を作成
    // https://openweathermap.org/current?collection=current_forecast&collection=current_forecast&collection=current_forecast&collection=current_forecast#name
    // レスポンスのフォーマット形式は JSON 形式 (`mode` オプション = default) レスポンス内容は以下参照
    // https://openweathermap.org/forecast5?collection=current_forecast&collection=current_forecast&collection=current_forecast#fields_JSON
    // `list.weather.id` の詳細は以下参照
    // https://openweathermap.org/weather-conditions
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
    var obj_dailyForecast = {}; // 日毎予報データ
    for(var int_idxOfList = 0 ; int_idxOfList < obj_forecastData.list.length ; int_idxOfList++){
        var obj_itemOfList = obj_forecastData.list[int_idxOfList]; // 時間毎予報データ

        var date_forecastTime = new Date((obj_itemOfList.dt + obj_forecastData.city.timezone) * 1000); // タイムゾーンと UTC 時刻差分を考慮した Date -> getUTC~() でタイムゾーンを考慮した日時を取得する目的
        var str_dateString_today = `${date_forecastTime.getUTCFullYear()}-${date_forecastTime.getUTCMonth()}-${date_forecastTime.getUTCDate()}`; // 日付のみを表す文字列

        addDailyForecast(str_dateString_today, obj_itemOfList); // `obj_dailyForecast` に追加

        // 00:00:00 の予報データは前日の予報データとしても扱う
        if (date_forecastTime.getUTCHours() === 0 && date_forecastTime.getUTCMinutes() === 0 && date_forecastTime.getUTCSeconds() === 0){ // 00:00:00 の場合
            var date_forecastTime_yesterday = new Date(date_forecastTime.getTime() - (3600 * 24 * 1000));
            var str_dateString_yesterday = `${date_forecastTime_yesterday.getUTCFullYear()}-${date_forecastTime_yesterday.getUTCMonth()}-${date_forecastTime_yesterday.getUTCDate()}`; // 日付のみを表す文字列(昨日)
            addDailyForecast(str_dateString_yesterday, obj_itemOfList); // `obj_dailyForecast` に追加
        }

    }

    //
    // `list` の特定要素を `obj_dailyForecast` に追加する
    //
    function addDailyForecast(str_dateStringToAdd, obj_itemOfListToAdd){
        if(!(str_dateStringToAdd in obj_dailyForecast)){ // 処理中の日付が日毎予報データに存在しない場合
            obj_dailyForecast[str_dateStringToAdd] = {
                'main': { // `list.main` を日単位にまとめた情報
                    'temp': undefined,
                    'feels_like': undefined,
                    'temp_min': undefined,
                    'temp_max': undefined,
                    'pressure': undefined,
                    'sea_level': undefined,
                    'grnd_level': undefined,
                    'humidity': undefined,
                    'temp_kf': undefined,
                },
                'weather': { // `list.weather` を日単位にまとめた情報
                    'id': undefined,
                    'main': undefined,
                    'description': undefined,
                    'icon': undefined,
                },
                'list_dtsorted': [], // `list.dt` の値でソートされた `list` の要素
            }
        }

        // 日毎予報データ -> 時間毎予報データ配列に追加
        var int_idx = 0;
        for(int_idx = (obj_dailyForecast[str_dateStringToAdd].list_dtsorted.length - 1) ; 0 <= int_idx ; int_idx--){ // 配列代入先要素番号の検索
            if (obj_dailyForecast[str_dateStringToAdd].list_dtsorted[int_idx].dt < obj_itemOfListToAdd.dt){
                break;
            }
        }
        obj_dailyForecast[str_dateStringToAdd].list_dtsorted.splice((int_idx + 1), 0, obj_itemOfListToAdd); // 日毎予報データに時間毎予報データを参照コピー
    }

    // 日毎予報データをカレンダーに登録
    Object.entries(obj_dailyForecast).forEach(([str_key, obj_value]) => {
        
        // カレンダーにイベント登録
        const strarr_datetmp = str_key.split('-');
        const date_forecastDay = new Date((parseInt((Date.UTC(parseInt(strarr_datetmp[0]), parseInt(strarr_datetmp[1]), parseInt(strarr_datetmp[2]))) / 1000) - obj_forecastData.city.timezone) * 1000); // 00:00 を表す Date を作成
        const date_forecastDay_next = new Date(date_forecastDay.getTime() + (86400 * 1000)); // 次の日の 00:00 を表す Date を作成

        // 既存のイベント検索
        // https://developers.google.com/apps-script/reference/calendar/calendar?hl=ja#getEvents(Date,Date)
        const CalendarEventarr_events = calendar.getEvents(date_forecastDay, date_forecastDay_next);

        // 保存先 CalendarEvent オブジェクト
        var CalendarEvent_toSaveEvent;

        if(0 < CalendarEventarr_events.length){ // 既存のイベントが存在する場合 //todo 暫定処理。1日1イベントのみ扱うカレンダーを想定
            // 複数イベントと扱う場合は、以下のように検索
            // for (var i = 0; i < CalendarEventarr_events.length; i++) {
            //     if (CalendarEventarr_events[i].isAllDayEvent() && CalendarEventarr_events[i].getTitle().startsWith("天気: ")) {
            //         CalendarEvent_toChageEvent = CalendarEventarr_events[i];
            //         break;
            //     }
            // }
            CalendarEvent_toSaveEvent = CalendarEventarr_events[0];

            // 前回の実行で天気予報データを JSON String で保存していた場合は取得
            // Note: `setDescription()` していないカレンダーイベントの場合は '' (空文字列) が返るのでエラーになる
            // https://developers.google.com/apps-script/reference/calendar/calendar?hl=ja#getDescription()
            const obj_list_dtsorted_old = JSON.parse(CalendarEvent_toSaveEvent.getDescription()); //todo 形式をチェックして問題なければ取り込む方式にする

            // 今回の実行で得た直近の天気予報データ (3時間分) より過去に対する天気予報データ (3時間分) がいくつあるのかを求める
            var int_idxOfList_sliceEnd = 0;
            for(int_idxOfList_sliceEnd = 0 ; int_idxOfList_sliceEnd < obj_list_dtsorted_old.length ; int_idxOfList_sliceEnd++){
                if(obj_value.list_dtsorted[0].dt <= obj_list_dtsorted_old[int_idxOfList_sliceEnd].dt){ // 今回の実行で得た直近の天気予報データ (3時間分) の対象時間 (UTC Sec) <= 前回の実行で保存した天気予報データの UTC Sec
                    break;
                }
            }
            // 今回の実行で得た天気予報データと過去に対する天気予報データの `list` を結合
            if(0 < int_idxOfList_sliceEnd){
                obj_value.list_dtsorted = obj_list_dtsorted_old.slice(0, int_idxOfList_sliceEnd).concat(obj_value.list_dtsorted);
            }

        }else{ // 既存のイベントが存在しない場合
            // 新しいイベントを作成
            // https://developers.google.com/apps-script/reference/calendar/calendar?hl=ja#createAllDayEvent(String,Date)
            CalendarEvent_toSaveEvent = calendar.createAllDayEvent('', date_forecastDay); //Note: 1st argment (title) は null を指定するとエラーになる
        }

        // 日毎の天気予報を算出
        calcDailyForecast(str_key, obj_value, obj_forecastData.city.timezone);

        // タイトルの設定
        const str_title = `${getEmojiFromWeatherId(obj_value.weather.id)} ${obj_value.main.temp_min.toFixed(1)}～${obj_value.main.temp_max.toFixed(1)} ℃`; //todo セルシウス表示固定
        CalendarEvent_toSaveEvent.setTitle(str_title);

        // 天気予報データを JSON String でカレンダーイベントの description に保存  
        // Note: `setTag()` で記録できるのは 800 Bite 程度  
        // ( `JSON.stringify()` する前提で考えると、せいぜい `list` 内要素 1 つ分程度(経験則))  
        // `setDescription()` の方が多く保存可能なよう (経験則) なので、こちらを使う  
        // `obj_value` 丸ごとだと容量オーバーらしく、自動でデータが切り捨てられるため、`obj_value.list_dtsorted` のみ保存  
        // https://developers.google.com/apps-script/reference/calendar/calendar?hl=ja#setDescription(String)
        CalendarEvent_toSaveEvent.setDescription(JSON.stringify(obj_value.list_dtsorted, null, '    '));



    });
}

//
// openweathermap.org の Weather condition codes に対応した絵文字を返す
// Weather condition codes の詳細は以下参照
// https://openweathermap.org/weather-conditions
function getEmojiFromWeatherId(int_weatherId){

    // Thunderstorm (雷雨)
    if (200 <= int_weatherId && int_weatherId < 300) {
        return '⛈';
    }

    // Drizzle (霧雨)
    if (300 <= int_weatherId && int_weatherId < 400) {
        return '🌦';
    }

    // Rain
    if (500 <= int_weatherId && int_weatherId < 600) {
        return '☂️';  // `🌧` だと見にくいので `☂️` (U+FE0E (テキスト) U+FE0F (絵文字指定)) を返す
    }

    // Snow
    if (600 <= int_weatherId && int_weatherId < 700) {
        return '❄';
    }

    // Mist / Fog etc -> 霧
    if (700 <= int_weatherId && int_weatherId < 800) {
        return '🌫';
    }

    // Clear
    if (int_weatherId === 800) {
        return '🔆'; // `☀` だと見にくいので `🔆` を返す
    }

    // Clouds
    if (800 < int_weatherId && int_weatherId < 900) {
        return '☁';
    }

    return '🌡';
}

//
// 日毎の天気予報を算出して `obj_dailyForecast` に書き込む
// 
function calcDailyForecast(str_key_day, obj_value_dailyForecast, int_timezone_utcsec){

    //【暫定処理】 その日の 11:00 を表す日時 を過ぎた予報の 0 番目の weather を採用する
    //todo 11:00 を大幅に過ぎた時間の予測データしか存在しない場合の考慮
    const strarr_datetmp = str_key_day.split('-');
    const int_utcSec1100 = (parseInt(Date.UTC(parseInt(strarr_datetmp[0]), parseInt(strarr_datetmp[1]), parseInt(strarr_datetmp[2]), 11) / 1000) - int_timezone_utcsec); // UTC 秒
    var int_idxOflist_whenOver1100 = 0;
    for(int_idxOflist_whenOver1100 = 0 ; int_idxOflist_whenOver1100 < (obj_value_dailyForecast.list_dtsorted.length - 1) ; int_idxOflist_whenOver1100++){ // 最後の要素の直前まで走査
        if(int_utcSec1100 < obj_value_dailyForecast.list_dtsorted[int_idxOflist_whenOver1100].dt){ // 11:00 を超えたとき
            break;
        }
    }
    Object.entries(obj_value_dailyForecast.weather).forEach(([str_key_weather, obj_value_weather]) => {
        obj_value_dailyForecast.weather[str_key_weather] = obj_value_dailyForecast.list_dtsorted[int_idxOflist_whenOver1100].weather[0][str_key_weather];
    });

    //【暫定処理】 その日最高・最低気温を求める
    //todo
    // 当日の過去 (早朝・午前中等) の予測データが openweathermap から返されない -> 最低・気温算出が狂う
    var dbl_temp_min_day = Infinity;
    var dbl_temp_max_day = -Infinity;
    for(var int_idxOfList = 0 ; int_idxOfList < (obj_value_dailyForecast.list_dtsorted.length) ; int_idxOfList++){ // 最高・最低気温抽出
        var obj_elemOfList = obj_value_dailyForecast.list_dtsorted[int_idxOfList];
        if(obj_elemOfList.main.temp_min < dbl_temp_min_day){ // 最低気温
            dbl_temp_min_day = obj_elemOfList.main.temp_min;
        }
        if(dbl_temp_max_day < obj_elemOfList.main.temp_max){ // 最高気温
            dbl_temp_max_day = obj_elemOfList.main.temp_max;
        }
    }
    obj_value_dailyForecast.main.temp_min = dbl_temp_min_day;
    obj_value_dailyForecast.main.temp_max = dbl_temp_max_day;

    return;

}
