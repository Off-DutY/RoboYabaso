//87 group Id: Cf712dd6f2676add8a6997fbeb0587619

var express = require('express');
var bodyParser = require('body-parser');
var https = require('https');
var http = require('http');
var request = require("request");
var rp = require('request-promise');
var cheerio = require("cheerio");
var app = express();
var fs = require('fs');

var jsonParser = bodyParser.json();

var outType = 'text';
var event = '';
var v_path = '/v2/bot/message/reply';

var timerFlag = 'off';
var voicelength = 0;
var idiotGroup = 'Cf712dd6f2676add8a6997fbeb0587619';

var twitchEmoji = require('./JsonData/twitchEmoji.json');
var J_newCharStatus = require('./JsonData/newCharStatus.json');
var JSONmapping = require('./JsonData/WebFileToJsonMapping.json');

// 房間入口
// key:value
// GroupMid : room Object
var TRPG = {
    first: {
        KP_MID: '',
        GP_MID: '',
        players: []
    }
};
TRPG.createRoom = function (p_mid, room_Obj) {
    eval('TRPG.' + p_mid + ' = room_Obj');
}

// 紀錄使用者的資訊，以及進入的房間
// key:value
// UserMid: {GP_MID,displayName,userId,pictureUrl,statusMessage}
var userToRoom = {};

app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    //  res.send(parseInput(req.query.input));
    res.send('Hello');
});

app.post('/', jsonParser, function (req, res) {
    event = req.body.events[0];
    let type = event.type;

    if (type == 'leave' && TRPG.hasOwnProperty(event.source.groupId)) {
        eval('delete TRPG.' + event.source.groupId);
        console.log('room existance: ' + TRPG.hasOwnProperty(event.source.groupId));
    }
    let msgType = event.message.type;
    let msg = event.message.text;
    let rplyToken = event.replyToken;
	
    if(msgType=="sticker"){
	console.log(event.message.packageId);
	console.log(event.message.stickerId);
    }

    let rplyVal = null;

    var roomMID = 'first';

    // 先找是否已經進入房間
    if (event.source.type == 'user') {
        for (var p in userToRoom) {
            if (p == event.source.userId) {
                for (var r in TRPG) {
                    if (userToRoom[p].GP_MID == r) {
                        roomMID = r;
                        break;
                    }
                }
            }
            if (roomMID != 'first') {
                break;
            }
        }
    } else if (event.source.type == 'group') {
        for (var r in TRPG) {
            if (r == event.source.groupId) {
                roomMID = r;
                break;
            }
        }
    }

    outType = 'text';

    console.log(msg);
    if (type == 'message' && msgType == 'text') {
        try {
            rplyVal = parseInput(roomMID, rplyToken, msg);
            console.log('rplyVal: ' + rplyVal);
        } catch (e) {
            console.log('parseInput error');
            console.log(e.toString());
        }
    }

    if (rplyVal) {
        if (outType == 'ccd') {
            replyMsgToLine('push', TRPG[roomMID].KP_MID, rplyVal);
        } else {
            replyMsgToLine(outType, rplyToken, rplyVal);
        }
    } else {
        console.log('Do not trigger');
    }

    res.send('ok');
});

app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

function replyMsgToLine(outType, rplyToken, rplyVal) {

    let rplyObj;
    if(outType == 'video'){
        v_path = '/v2/bot/message/reply';
        rplyObj = {
            replyToken: rplyToken,
            messages: [{
	        "type": "video",
	        "originalContentUrl": rplyVal,
	        "previewImageUrl": "https://github.com/sleepingcat103/RoboYabaso/raw/master/201542716135.png"
	    }]
        }
    } else if(outType == 'audio'){
        v_path = '/v2/bot/message/reply';
        rplyObj = {
            replyToken: rplyToken,
            messages: [{
	        "type": "audio",
	        "originalContentUrl": rplyVal,
	        "duration": voicelength
	    }]
        }
    } else if (outType == 'image') {
        v_path = '/v2/bot/message/reply';
        rplyObj = {
            replyToken: rplyToken,
            messages: [{
                type: "image",
                originalContentUrl: rplyVal,
                previewImageUrl: rplyVal
            }]
        }
    } else if (outType == 'sticker') {
        v_path = '/v2/bot/message/reply';
        rplyObj = {
            replyToken: rplyToken,
            messages: [rplyVal]
        }
    } else if (outType == 'push') {
        v_path = '/v2/bot/message/push';
        rplyObj = {
            to: rplyToken,
            messages: [{
                type: "text",
                text: rplyVal
            }]
        }
    } else if (outType == 'pushsecret') {
        v_path = '/v2/bot/message/push';
        rplyObj = {
            to: rplyToken,
            messages: [{
	        "type": "audio",
	        "originalContentUrl": rplyVal,
	        "duration": voicelength
	    }]
        }
    } else {
        v_path = '/v2/bot/message/reply';
        rplyObj = {
            replyToken: rplyToken,
            messages: [{
                type: "text",
                text: rplyVal
            }]
        }
    }

    let rplyJson = JSON.stringify(rplyObj);
    var options = setOptions();
    var request = https.request(options, function (response) {
        response.setEncoding('utf8');
        response.on('data', function (body) {
            console.log(body);
        });
    });
    request.on('error', function (e) {
        console.log('Request error: ' + e.message);
    })
    request.end(rplyJson);
}

function setOptions() {
    var options = {
        host: 'api.line.me',
        port: 443,
        path: v_path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer NehLVvCofvY5tYr0O4Yl4WS8ZFw1LaCAWJPaCSZEh2Wl4FhusH4t19/ftO4XV9FLzBK8oXJ/wC0207KUQSTObQznYsqGAAI6q0PNHyPrjF+7WtBiHjL/c0qkAkHkgqi5qQ2Gp7DaTjDKx/X8WB0zDgdB04t89/1O/w1cDnyilFU='
        }
    }
    return options;
}

function getUserProfile(p_MID) {

    v_path = '/v2/bot/profile/' + p_MID;
    var options = {
        host: 'api.line.me',
        port: 443,
        path: v_path,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer NehLVvCofvY5tYr0O4Yl4WS8ZFw1LaCAWJPaCSZEh2Wl4FhusH4t19/ftO4XV9FLzBK8oXJ/wC0207KUQSTObQznYsqGAAI6q0PNHyPrjF+7WtBiHjL/c0qkAkHkgqi5qQ2Gp7DaTjDKx/X8WB0zDgdB04t89/1O/w1cDnyilFU='
        }
    };
    v_path = null;
    var request = https.request(options, function (response) {
        console.log('Status: ' + response.statusCode);
        console.log('Headers: ' + JSON.stringify(response.headers));
        response.setEncoding('utf8');
        response.on('data', function (body) {
            var newBody = MyJSONStringify(body);
            userToRoom[p_MID].displayName = newBody.displayName;
            userToRoom[p_MID].userId = newBody.userId;
            userToRoom[p_MID].pictureUrl = newBody.pictureUrl;
            userToRoom[p_MID].statusMessage = newBody.statusMessage;
            //eval('replyMsgToLine(\'push\', userToRoom.'+ p_MID +'.GP_MID , newBody.displayName + \' 加入群組囉!!\' )');
            replyMsgToLine('push', userToRoom[p_MID].GP_MID, userToRoom[p_MID].displayName + ' 加入房間囉!!');
            newBody = null;
        });
    });

    request.on('error', function (e) {
        console.log('Request error: ' + e.message);
    });
    request.end();
}

////////////////////////////////////////
//////////////// 分析開始 //////////////
////////////////////////////////////////
function parseInput(roomMID, rplyToken, inputStr) {

    //console.log('InputStr: ' + inputStr);
    _isNaN = function (obj) {
        return isNaN(parseInt(obj));
    }
    let msgSplitor = (/\S+/ig);
    let mainMsg = inputStr.match(msgSplitor); //定義輸入字串
    let trigger = mainMsg[0].toString().toLowerCase(); //指定啟動詞在第一個詞&把大階強制轉成細階
    if (trigger == '貓咪') {
        return MeowHelp();
	    
    } else if (trigger.match(/喵/) != null) {
        return Meow();
    }
}

////////////////////////////////////////
//////////////// special return (sticker & image)
////////////////////////////////////////
function Sticker(package, sticker){
	outType = 'sticker';
	var stk = {
	    type: "sticker",
	    packageId: package,
	    stickerId: sticker
	};
	return stk;
}

////////////////////////////////////////
//////////////// COC6 CCB成功率骰
////////////////////////////////////////
function ccb(roomMID, chack, text) {
    var val_status = chack;
    for (i = 0; i < TRPG[roomMID].players.length; i++) {
        if (val_status.toString() == TRPG[roomMID].players[i].getVal('name')) {
            val_status = TRPG[roomMID].players[i].getVal(text);
            break;
        }
    }
    if (val_status <= 99) {
        return coc6(val_status, text);
    } else {
        return '**Error**\n找不到該角色或者輸入錯誤';
    }
}

function ccd(chack, text, who) {
    if (chack <= 99) {
        return ccd_dice(who, chack, text)
    } else {
        return '**Error**\n輸入錯誤';
    }
}

function coc6(chack, text) {

    let temp = Dice(100);
    if (text == null) {
        if (temp > 95) return 'ccb<=' + chack + ' ' + temp + ' → 大失敗！哈哈哈！';
        if (temp <= chack) {
            if (temp <= 5) return 'ccb<=' + chack + ' ' + temp + ' → 喔喔！大成功！';
            else return 'ccb<=' + chack + ' ' + temp + ' → 成功';
        } else return 'ccb<=' + chack + ' ' + temp + ' → 失敗';
    } else {
        if (temp > 95) return 'ccb<=' + chack + ' ' + temp + ' → ' + text + ' 大失敗！哈哈哈！';
        if (temp <= chack) {
            if (temp <= 5) return 'ccb<=' + chack + ' ' + temp + ' → ' + text + ' 大成功！';
            else return 'ccb<=' + chack + ' ' + temp + ' → ' + text + ' 成功';
        } else return 'ccb<=' + chack + ' ' + temp + ' → ' + text + ' 失敗';
    }
}

function ccd_dice(p_name, chack, text) {

    let temp = Dice(100);
    if (text == null) {
        if (temp > 95) return p_name + '做了' + 'ccd<=' + chack + ' ' + temp + ' → 大失敗！哈哈哈！';
        if (temp <= chack) {
            if (temp <= 5) return p_name + '做了' + 'ccd<=' + chack + ' ' + temp + ' → 喔喔！大成功！';
            else return p_name + '做了' + 'ccd<=' + chack + ' ' + temp + ' → 成功';
        } else return p_name + '做了' + 'ccd<=' + chack + ' ' + temp + ' → 失敗';
    } else {
        if (temp > 95) return p_name + '做了' + 'ccd<=' + chack + ' ' + temp + ' → ' + text + ' 大失敗！哈哈哈！';
        if (temp <= chack) {
            if (temp <= 5) return p_name + '做了' + 'ccd<=' + chack + ' ' + temp + ' → ' + text + ' 大成功！';
            else return p_name + '做了' + 'ccd<=' + chack + ' ' + temp + ' → ' + text + ' 成功';
        } else return p_name + '做了' + 'ccd<=' + chack + ' ' + temp + ' → ' + text + ' 失敗';
    }
}

////////////////////////////////////////
//////////////// COC6傳統創角
////////////////////////////////////////      



function build6char() {

    let ReStr = '六版核心創角：';
    let str = BuildDiceCal('3d6', 0);
    let siz = BuildDiceCal('(2d6+6)', 0);

    ReStr = ReStr + '\nＳＴＲ：' + str;
    ReStr = ReStr + '\nＤＥＸ：' + BuildDiceCal('3d6', 0);
    ReStr = ReStr + '\nＣＯＮ：' + BuildDiceCal('3d6', 0);
    ReStr = ReStr + '\nＰＯＷ：' + BuildDiceCal('3d6', 0);
    ReStr = ReStr + '\nＡＰＰ：' + BuildDiceCal('3d6', 0);
    ReStr = ReStr + '\nＩＮＴ：' + BuildDiceCal('(2d6+6)', 0);
    ReStr = ReStr + '\nＳＩＺ：' + siz;
    ReStr = ReStr + '\nＥＤＵ：' + BuildDiceCal('(3d6+3)', 0);

    let strArr = str.split(' ');
    let sizArr = siz.split(' ');
    let temp = parseInt(strArr[2]) + parseInt(sizArr[2]);

    ReStr = ReStr + '\nＤＢ：' + db(temp, 0);
    return ReStr;
}

////////////////////////////////////////
//////////////// 普通ROLL
////////////////////////////////////////
function nomalDiceRoller(inputStr, text0, text1, text2) {

    //首先判斷是否是誤啟動（檢查是否有符合骰子格式）
    // if (inputStr.toLowerCase().match(/\d+d\d+/) == null) return undefined;

    //再來先把第一個分段拆出來，待會判斷是否是複數擲骰
    let mutiOrNot = text0.toLowerCase();

    //排除小數點
    if (mutiOrNot.toString().match(/\./) != null) return undefined;

    //先定義要輸出的Str
    let finalStr = '';


    //是複數擲骰喔
    if (mutiOrNot.toString().match(/\D/) == null) {
        if (text2 != null) {
            finalStr = text0 + '次擲骰：\n' + text1 + ' ' + text2 + '\n';
        } else {
            finalStr = text0 + '次擲骰：\n' + text1 + '\n';
        }
        if (mutiOrNot > 30) return '不支援30次以上的複數擲骰。';

        for (i = 1; i <= mutiOrNot; i++) {
            let DiceToRoll = text1.toLowerCase();
            if (DiceToRoll.match('d') == null) return undefined;

            //寫出算式
            let equation = DiceToRoll;
            while (equation.match(/\d+d\d+/) != null) {
                let tempMatch = equation.match(/\d+d\d+/);
                equation = equation.replace(/\d+d\d+/, RollDice(tempMatch));
            }

            //計算算式
            let aaa = equation;
            aaa = aaa.replace(/\d+[[]/ig, '(');
            aaa = aaa.replace(/]/ig, ')');
            //aaa = aaa.replace(/[[]\d+|]/ig, "");
            let answer = eval(aaa.toString());

            finalStr = finalStr + i + '# ' + equation + ' = ' + answer + '\n';
        }

    } else {
        //一般單次擲骰
        let DiceToRoll = mutiOrNot.toString().toLowerCase();
        DiceToRoll = DiceToRoll.toLowerCase();
        if (DiceToRoll.match('d') == null) return undefined;

        //寫出算式
        let equation = DiceToRoll;
        while (equation.match(/\d+d\d+/) != null) {
            let totally = 0;
            let tempMatch = equation.match(/\d+d\d+/);
            if (tempMatch.toString().split('d')[0] > 300) return undefined;
            if (tempMatch.toString().split('d')[1] == 1 || tempMatch.toString().split('d')[1] > 1000000) return undefined;
            equation = equation.replace(/\d+d\d+/, RollDice(tempMatch));
        }

        //計算算式
        let aaa = equation;
        aaa = aaa.replace(/\d+[[]/ig, '(');
        aaa = aaa.replace(/]/ig, ')');
        let answer = eval(aaa.toString());

        if (text1 != null) {
            finalStr = text0 + '：' + text1 + '\n' + equation + ' = ' + answer;
        } else {
            finalStr = text0 + '：\n' + equation + ' = ' + answer;
        }

    }

    return finalStr;
}


////////////////////////////////////////
//////////////// 擲骰子運算
////////////////////////////////////////

function sortNumber(a, b) {
    return a - b
}


function Dice(diceSided) {
    return Math.floor((Math.random() * diceSided) + 1)
}

function RollDice(inputStr) {
    //先把inputStr變成字串（不知道為什麼非這樣不可）
    let comStr = inputStr.toString();
    let finalStr = '[';
    let temp = 0;
    var totally = 0;
    for (let i = 1; i <= comStr.split('d')[0]; i++) {
        temp = Dice(comStr.split('d')[1]);
        totally += temp;
        finalStr = finalStr + temp + '+';
    }

    finalStr = finalStr.substring(0, finalStr.length - 1) + ']';
    finalStr = finalStr.replace('[', totally + '[');
    return finalStr;
}

function FunnyDice(diceSided) {
    return Math.floor((Math.random() * diceSided)) //猜拳，從0開始
}

function BuildDiceCal(inputStr, flag) {

    //首先判斷是否是誤啟動（檢查是否有符合骰子格式）
    if (inputStr.toLowerCase().match(/\d+d\d+/) == null) return undefined;

    //排除小數點
    if (inputStr.toString().match(/\./) != null) return undefined;

    //先定義要輸出的Str
    let finalStr = '';

    //一般單次擲骰
    let DiceToRoll = inputStr.toString().toLowerCase();
    if (DiceToRoll.match('d') == null) return undefined;

    //寫出算式
    let equation = DiceToRoll;
    while (equation.match(/\d+d\d+/) != null) {
        let tempMatch = equation.match(/\d+d\d+/);
        if (tempMatch.toString().split('d')[0] > 200) return '不支援200D以上擲骰唷';
        if (tempMatch.toString().split('d')[1] == 1 || tempMatch.toString().split('d')[1] > 500) return '不支援D1和超過D500的擲骰唷';
        equation = equation.replace(/\d+d\d+/, BuildRollDice(tempMatch));
    }

    //計算算式
    let answer = eval(equation.toString());
    finalStr = equation + ' = ' + answer;
    if (flag == 0) return finalStr;
    if (flag == 1) return answer;


}

function BuildRollDice(inputStr) {
    //先把inputStr變成字串（不知道為什麼非這樣不可）
    let comStr = inputStr.toString().toLowerCase();
    let finalStr = '(';

    for (let i = 1; i <= comStr.split('d')[0]; i++) {
        finalStr = finalStr + Dice(comStr.split('d')[1]) + '+';
    }

    finalStr = finalStr.substring(0, finalStr.length - 1) + ')';
    return finalStr;
}

////////////////////////////////////////
//////////////// DB計算
////////////////////////////////////////
function db(value, flag) {
    let restr = '';
    if (value >= 2 && value <= 12) restr = '-1D6';
    if (value >= 13 && value <= 16) restr = '-1D4';
    if (value >= 17 && value <= 24) restr = '+0';
    if (value >= 25 && value <= 32) restr = '+1D4';
    if (value >= 33 && value <= 40) restr = '+1D6';
    if (value < 2 || value > 40) restr = '?????';
    //return restr;	
    if (flag == 0) return restr;
    if (flag == 1) return 'db -> ' + restr;
}

////////////////////////////////////////
//////////////// 占卜&其他
////////////////////////////////////////


function BStyleFlagSCRIPTS() {
    let rplyArr = ['\
「打完這仗我就回老家結婚」', '\
「打完這一仗後我請你喝酒」', '\
「你、你要錢嗎！要什麼我都能給你！/我可以給你更多的錢！」', '\
「做完這次任務，我就要結婚了。」', '\
「幹完這一票我就金盆洗手了。」', '\
「好想再XXX啊……」', '\
「已經沒什麼好害怕的了」', '\
「我一定會回來的」', '\
「差不多該走了」', '\
「我只是希望你永遠不要忘記我。」', '\
「我只是希望能永遠和你在一起。」', '\
「啊啊…為什麼會在這種時候、想起了那些無聊的事呢？」', '\
「能遇見你真是太好了。」', '\
「我終於…為你們報仇了！」', '\
「等到一切結束後，我有些話想跟妳說！」', '\
「這段時間我過的很開心啊。」', '\
把自己的寶物借給其他人，然後說「待一切結束後記得還給我。」', '\
「真希望這份幸福可以永遠持續下去。」', '\
「我們三個人要永永遠遠在一起！」', '\
「這是我女兒的照片，很可愛吧？」', '\
「請告訴他/她，我永遠愛他/她」', '\
「聽好，在我回來之前絕不要亂走動哦」', '\
「要像一個乖孩子一樣等著我回來」', '\
「我去去就來」', '\
「快逃！」', '\
「對方只有一個人，大家一起上啊」', '\
「我就不信，這麼多人還殺不了他一個！」', '\
「幹，幹掉了嗎？」', '\
「身體好輕」', '\
「可惡！你給我看著！（逃跑）」', '\
「躲在這裡就應該不會被發現了吧。」', '\
「我不會讓任何人死的。」', '\
「可惡！原來是這麼回事！」', '\
「跑這麼遠應該就行了。」', '\
「我已經甚麼都不怕了」', '\
「這XXX是什麼，怎麼之前沒見過」', '\
「什麼聲音……？就去看一下吧」', '\
「是我的錯覺嗎？/果然是錯覺/錯覺吧/可能是我（看/聽）錯了」', '\
「二十年後又是一條好漢！」', '\
「大人/將軍武運昌隆」', '\
「這次工作的報酬是以前無法比較的」', '\
「我才不要和罪犯呆在一起，我回自己的房間去了！」', '\
「其實我知道事情的真相…（各種廢話）…犯人就是……」', '\
「我已經天下無敵了~~」', '\
「大人！這邊就交給小的吧，請快離開這邊吧」', '\
「XX，這就是我們流派的最終奧義。這一招我只會演示一次，你看好了！」', '\
「誰敢殺我？」', '\
「從來沒有人能越過我的劍圍。」', '\
「就算殺死也沒問題吧？」', '\
「看我塔下強殺！」', '\
「騙人的吧，我們不是朋友嗎？」', '\
「我老爸是....你有種就....」', '\
「我可以好好利用這件事」'];

    return rplyArr[Math.floor((Math.random() * (rplyArr.length)) + 0)];
}


function Luck(str, replyToken) {
    var table = ['牡羊.白羊.牡羊座.白羊座', '金牛.金牛座', '雙子.雙子座', '巨蟹.巨蟹座', '獅子.獅子座', '處女.處女座', '天秤.天平.天秤座.天平座', '天蠍.天蠍座', '射手.射手座', '魔羯.魔羯座', '水瓶.水瓶座', '雙魚.雙魚座'];
    var target = str.replace('運氣', '').replace('運勢','');
	
    var index = table.indexOf(table.find(function(element){
        if(element.indexOf(target)>0) return element;
    }));
	
    if(index>0){
        Constellation(index, replyToken);
	return;
    }else{
        let rplyArr = ['超大吉', '大吉', '大吉', '中吉', '中吉', '中吉', '小吉', '小吉', '小吉', '小吉', '凶', '凶', '凶', '大凶', '大凶', '你還是，不要知道比較好', '這應該不關我的事'];
        return str + ' ： ' + rplyArr[Math.floor((Math.random() * (rplyArr.length)) + 0)];
    }
}

function Constellation(index, replyToken) {
    var today = new Date().toISOString().substring(0, 10);
    var options = {
        uri: 'http://astro.click108.com.tw/daily_' + index + '.php?iAcDay=' + today + '&iAstro=' + index,
        transform: function (body) {
            return cheerio.load(body);
        }
    };
    rp(options).then(function ($) {
        var fax = $(".TODAY_CONTENT")[0]
        
        var s = 
        fax.children[1].children[0].data + '\n' +
        fax.children[3].children[0].children[0].data + '\n' +
        fax.children[4].children[0].data + '\n' +
        fax.children[6].children[0].children[0].data + '\n' +
        fax.children[7].children[0].data + '\n' +
        fax.children[9].children[0].children[0].data + '\n' +
        fax.children[10].children[0].data + '\n' +
        fax.children[12].children[0].children[0].data + '\n' +
        fax.children[13].children[0].data;
        
        replyMsgToLine(outType, replyToken, s);
    })
    .catch(function (err) {
        console.log("Fail to get data.");
    });
}

////////////////////////////////////////
//////////////// Others
////////////////////////////////////////

function SortIt(input, mainMsg) {

    let a = input.replace(mainMsg[0], '').match(/\S+/ig);
    for (var i = a.length - 1; i >= 0; i--) {
        var randomIndex = Math.floor(Math.random() * (i + 1));
        var itemAtIndex = a[randomIndex];
        a[randomIndex] = a[i];
        a[i] = itemAtIndex;
    }
    return mainMsg[0] + ' → [' + a + ']';
}

function choice(input, str) {
    let a = input.replace(str[0], '').match(/\S+/ig);
    return str[0] + '[' + a + '] → ' + a[Dice(a.length) - 1];
}

function MyJSONStringify(object) {
    var simpleObject = '';
    for (var prop in object) {
        if (!object.hasOwnProperty(prop)) {
            continue;
        }
        if (typeof (object[prop]) == 'object') {
            continue;
        }
        if (typeof (object[prop]) == 'function') {
            continue;
        }
        //simpleObject[prop] = object[prop];
        simpleObject += object[prop];
    }
    return JSON.parse(simpleObject);
};

function padLeft(str, length) {
    if (str.length >= length)
        return str;
    else
        return padLeft('　' + str, length);
}

function padRight(str, length) {
    if (str.length >= length)
        return str;
    else
        return padRight(str + '　', length);
}

function GetUrl(url, data) {
    if (data != "" && typeof data != "undefined") {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
            var dataName = keys[i];
            if (data.hasOwnProperty(dataName)) {
                url += (i == 0) ? "?" : "&";
                url += dataName + "=" + data[dataName];
            }
        }
    }
    return url;
}

function IsKeyWord(target, strs){
    if(target==null||strs==null){
        return false;
    }
	
    if(target == strs)
	return true;
	
    for(i=0; i<strs.length; i++){
        if(target == strs[i]){
            return true;
        }
    }
    return false;
}
////////////////////////////////////////
//////////////// Help
////////////////////////////////////////

function Help() {
    return '【擲骰BOT】 貓咪&小伙伴‧改\
		\n 支援角卡、房間、KP、暗骰等功能\
		\n 使用說明:\
		\n https://github.com/sleepingcat103/RoboYabaso/blob/master/README.txt\
		';
}

function MeowHelp() {
    return Meow() + '\n要做什麼喵?\n\n(輸入 help 幫助 以獲得資訊)';
}

function Meow() {
    let rplyArr = ['喵喵?', '喵喵喵', '喵?', '喵~', '喵喵喵喵!', '喵<3', '喵喵.....', '喵嗚~', '喵喵! 喵喵喵!', '喵喵', '喵', '\
喵喵?', '喵喵喵', '喵?', '喵~', '喵喵喵喵!', '喵<3', '喵喵.....', '喵嗚~', '喵喵! 喵喵喵!', '喵喵', '喵', '\
喵喵?', '喵喵喵', '喵?', '喵~', '喵喵喵喵!', '喵<3', '喵喵.....', '喵嗚~', '喵喵! 喵喵喵!', '喵喵', '喵', '\
喵喵!', '喵喵....喵?', '喵!!!', '喵~喵~', '喵屁喵', '喵三小?', '玩不膩喵?'];
    return rplyArr[Math.floor((Math.random() * (rplyArr.length)) + 0)];
}

function Cat() {
    let rplyArr = ['喵喵?', '喵喵喵', '喵?', '喵~', '喵喵喵喵!', '喵<3', '喵喵.....', '喵嗚~', '喵喵! 喵喵喵!', '喵喵', '喵', '\
喵喵?', '喵喵喵', '喵?', '喵~', '喵喵喵喵!', '喵<3', '喵喵.....', '喵嗚~', '喵喵! 喵喵喵!', '喵喵', '喵', '\
喵喵?', '喵喵喵', '喵?', '喵~', '喵喵喵喵!', '喵<3', '喵喵.....', '喵嗚~', '喵喵! 喵喵喵!', '喵喵', '喵', '\
喵喵!', '喵喵....喵?', '喵!!!', '喵~喵~', '衝三小', '87玩夠沒', '生ㄎㄎㄎㄎㄎㄎ'];
    return rplyArr[Math.floor((Math.random() * (rplyArr.length)) + 0)];
}

function Google(){
    let rplyArr = ['google很難嗎喵?', '(用腳踩)', '才..才不是特地為你去找的喵!', '找好了!\n酬勞就罐罐10個就好了喵<3', '這..這批很純...' + '\
虐貓!!本貓要罷工喵!!', '(投以鄙視的眼神)', '下次叫狗去找好喵?', '以上內容兒童不宜喵 >///<', '本網站內容只適合18歲或以上人士觀看喵', '\
小學生才叫貓google喵', '搜尋這甚麼鬼東西喵!! (炸毛)', '好不容易幫你搜尋了，心懷感激的看吧喵!', '居然搜尋這種東西真的是擔心你的腦袋喵...'];
    return rplyArr[Math.floor((Math.random() * (rplyArr.length)) + 0)];
}

function Bro() {
    let rplyArr = ['大哥是對的!!', '叫本大爺有何貴幹?', '幹嘛? 說好的貓罐罐呢?', '大哥你叫的?', '大哥永遠是對的!!!!'];
    return rplyArr[Math.floor((Math.random() * (rplyArr.length)) + 0)];
};

function L() {
    let rplyArr = ['通通他媽給我上線，等等我一個一個點名= =', 'ㄇㄉ給我上線喔 ( *・ω・)✄╰ひ╯', '叫你R 王振宇', '過氣糞Game開起來!'];
    return rplyArr[Math.floor((Math.random() * (rplyArr.length)) + 0)];
};


////////////////////////////////////////
////////////////prototype
////////////////////////////////////////
String.prototype.halfToFull = function (flag) {
    var temp = "";
    for (var i = 0; i < this.toString().length; i++) {
        var charCode = this.toString().charCodeAt(i);
        if (charCode <= 126 && charCode >= 33) {
            charCode += 65248;
        } else if (charCode == 32) { // 半形空白轉全形
	    if(flag){
                charCode = 12288;
	    }
        }
        temp = temp + String.fromCharCode(charCode);
    }
    return temp;
};
