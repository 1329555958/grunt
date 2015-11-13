/**
 * Created by lijinkui on 2015/11/2.
 */

var express = require('express');
var dashboardRouter = express.Router();
var responseResult = require('../service/utils/ResponseResult');
var lodash = require('lodash');

var client = require('../service/client/es');
var es_constant = require('../service/utils/EsConstant');

/**
 * 以json格式响应请求
 * **/
function JsonResponse(err,res){
    result=responseResult();
    if(err){
        result.success=false;
        result.message=err.message;
    }else{
        result.success=true;
        result.message="success";
    }
    res.json(result);
}

/**
 * 查询标签
 * **/
dashboardRouter.post('/tag/queryList',function(req,res){
    client.search({
        index:es_constant.INDEX,
        type:es_constant.ES_TYPE.DASHBOARD,
        sort:"id:asc"
    },function(err,response){
        console.log("查询完成");
        console.log(response);
        if(!err){
            res.json(lodash.pluck(response.hits.hits,'_source'));
        }else{
            res.json({'success':false,'message':err.message});
        }
    });
});


/**
 * 保存或编辑标签
 * **/
dashboardRouter.post('/tag/saveOrUpdate', function (req,res) {
    var tagEntity=req.body;
    client.index({
        index:es_constant.INDEX,
        type:es_constant.ES_TYPE.DASHBOARD,
        id:tagEntity.id,
        body:tagEntity
    },function(err,response){
        console.log("标签保存完成");
        console.log(response);
        JsonResponse(err,res);
    });


});


/**
 * 删除标签
 * **/
dashboardRouter.post('/tag/delete',function(req,res){
    var tag=req.body;
    client.delete({
        index:es_constant.INDEX,
        type:es_constant.ES_TYPE.DASHBOARD,
        id:tag.tagId
    },function(err,response){
        if(err&&err.status=='404'){
            err=null;
        }
        JsonResponse(err,res);
    });
});

module.exports=dashboardRouter;