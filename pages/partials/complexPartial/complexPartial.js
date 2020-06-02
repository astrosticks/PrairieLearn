const ejs = require('ejs');

exports.render = function(element, callback) {
  // Do something here that's more complicated than just rendering an EJS file,
  // such as an SQL query, etc.
  ejs.renderFile(__filename.replace(/\.js$/, '.ejs'), element.content, null, function(err, str){
    element.rendered = str;
    callback();
  });
}
