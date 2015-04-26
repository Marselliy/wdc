/**
 * DataProcController
 *
 * @description :: Server-side logic for managing data processes
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  /**
   * `DataProcController.process()`
   */
  process: function (req, res) {
    var launchingFilePath = sails.config.executables[req.body.proc_name];
    var child = require('child_process').fork(launchingFilePath, [], {silent: true});

    var tempObj = req.body;
    // response type doesn't matter - we compute every time
    delete tempObj.response_type;
    var md5 = require('object-hash').MD5(tempObj);

    ProcData.findOne({hash : md5}).then(function (json) {
      // json, corresponding to md5 hash of the request already
      // exists in a database, so there is no need to process it
      // again, just send back previous computational result
      if (json) {
        if (!json.parent) {
          delete json.parent;
        }
        json.data = json.value;
        delete json.value;
        if (req.body.response_type === 'data_id') {
          delete json.data;
        }
        delete json.hash;
        delete json.createdAt;
        delete json.updatedAt;
        json.data_id = json.id;
        delete json.id;
        json.status_code = 0;
        return res.send(json);
      } else {
        var obj_to_process = {};
        var parent_proc = "";
        if (req.body.data) {
          obj_to_process.data = req.body.data;
          obj_to_process.params = req.body.params;
          child.send(obj_to_process);
        } else if (req.body.data_id) {
          ProcData.findOne({
            id: req.body.data_id
          }, function (err, found) {
            if (!err) {
              if (found) {
                if (found.isDataSource) {
                  obj_to_process = found;
                } else {
                  obj_to_process.data = found.value;
                  obj_to_process.params = req.body.params;
                }
                parent_proc = found.id;
                child.send(obj_to_process);
              } else {
                return res.forbidden('No data was found for the specified id: ' + req.body.data_id);
              }
            } else {
              return res.serverError();
            }
          })
        } else {
          return res.badRequest('Request must contain either data or data_id field');
        }

        var res_body = {};
        var err_body = {};
        child.on('message', function(msg) {
          res_body.data = msg;
        });

        child.stderr.on('data', function(err) {
          err_body.err = err.toString();
        });

        child.on('close', function(code) {
          if (code == 0) {
            res_body.status_code = code;
            sails.log.debug('Child Process return: ' + code);
            // save result to DB
            ProcData.create({
              value: res_body.data,
              parent: parent_proc,
              hash: md5
            }, function (err, obj) {
              if (err) {
                sails.log.error('Error while processing proc request: ' + err);
                return res.serverError();
              } else {
                res_body.data_id = obj.id;
                if (parent_proc) {
                  res_body.parent = parent_proc;
                }
                if (req.body.response_type === 'data_id') {
                  delete res_body.data;
                }
                return res.json(res_body);
              }
            });
          } else {
            err_body.status_code = code;
            sails.log.debug('Error while processing request: ' + err_body);
            return res.badRequest(err_body);
          }
        });
      }
    });
  },


  /**
   * `DataProcController.getById()`
   *  Gets a data by its id
   */
  getById: function (req, res) {
    ProcData.findOne({
      id: req.params.dataId
    }, function (err, found) {
      if (!err) {
        if (found) {
          if (!found.parent) delete found.parent;
          delete found.createdAt;
          delete found.updatedAt;
          delete found.hash;
          res.send(found);
        } else {
          res.forbidden();
        }
      } else {
        res.serverError();
      }
    });
  }
};

