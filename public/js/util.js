/**
 * Created by weichunhe on 2015/10/27.
 */
define('util', ['base'], function () {
    return function (t) {
        /**
         * 构造 es 查询的q 参数
         * 符合lucene 查询语法
         * http://lucene.apache.org/core/2_9_4/queryparsersyntax.html
         * @param obj
         * @param op 逻辑运算符 ' AND ' 或者 ' OR '
         */
        t.makeEsQ = function (obj, op) {
            op = op || ' AND ';
            var q = [];
            _.each(obj, function (val, key) {
                val && q.push(key + ':' + val + '*');
            });
            return q.join(op);
        };
        /**
         * 生成唯一id
         * @param prefix 前缀
         * @returns {string}
         */
        t.makeUniqueId = function (prefix) {
            return prefix + '_' + _.now() + '_' + _.uniqueId();
        };

    };
});