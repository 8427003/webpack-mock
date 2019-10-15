const fs = require('fs');
const JSON5 = require('json5');
const path = require('path');

let mTimeCache = {};

// 缓存api.json文件数据
let apiJsonFileCache;

// api.json文件地址
let MOCK_API_JSON_FILE;

// 这里的请求路径能命中${contentBase}或者${output.path}就不匹配这里
function pass(req, res, proxyOptions) {
    let stats;
    try {
        stats = fs.statSync(MOCK_API_JSON_FILE)
    }
    catch(e){

        //  如果没有api.json文件，不需要mock
        return false;
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
            return false;
        }

        let result = JSON5.parse(mockData)
        res.json(result);

        // 如果命中了mock 文件，期望就不调用next，但webpack-dev-server没有留阻止next调用接口
        // 会遇到一个问题，后面的中间件可能会再次res.end而引起程序异常。
        // 这里 connect-history-api-fallback 就遇到了此问题，根据connect-history-api-fallback 代码作trick处理
        // 如果 req.headers.accept.indexOf('application/json') === 0，connect-history-api-fallback就跳过执行
        return;
    }
    return;
}

module.exports = function (mockApiJsonFile) {
    MOCK_API_JSON_FILE = mockApiJsonFile;

    return pass;
}
