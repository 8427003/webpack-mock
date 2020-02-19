const fs = require('fs');
const JSON5 = require('json5');
const path = require('path');

let mTimeCache = {};

// 缓存api.json文件数据
let apiJsonFileCache;

// api.json文件地址
let MOCK_API_JSON_FILE;

// 这里的请求路径能命中${contentBase}或者${output.path}就不匹配这里
function pass(req, res, next) {
    let stats;
    try {
        stats = fs.statSync(MOCK_API_JSON_FILE)
    }
    catch(e){

        //  如果没有api.json文件，不需要mock
        return (typeof next === 'function') &&  next();
    }

    //  如果api.json文件有改动,从新读取
    if(mTimeCache[MOCK_API_JSON_FILE] !== stats.mtime){

        // 缓存mtime
        mTimeCache[MOCK_API_JSON_FILE] = stats.mtime;

        let tmpData = fs.readFileSync(MOCK_API_JSON_FILE, 'utf8')
        try {
            apiJsonFileCache = JSON5.parse(tmpData);
        }
        catch(e){
            console.error(MOCK_API_JSON_FILE);
            console.error(e);
            return false;
        }
    }

    // 根据请求接口路径，从api.json文件找出相应mock数据文件路径
    var mockDataFile = apiJsonFileCache[req.path];

    if(mockDataFile) {
        let mockDataFileFullPath  = path.resolve(path.dirname(MOCK_API_JSON_FILE), mockDataFile);
        let mockData;

        // 读取mockData数据
        try {
            mockData = fs.readFileSync(mockDataFileFullPath, 'utf8')
        }
        catch(e){
            console.warn('warn: 404', "request:",req.path+",", 'not found:', mockJsonPath)
            return res.sendStatus(404);
        }

        let result = JSON5.parse(mockData)
        res.json(result);

        return;
    }
    return (typeof next === 'function') &&  next();
}

module.exports = function (mockApiJsonFile) {
    MOCK_API_JSON_FILE = mockApiJsonFile;

    return pass;
}
