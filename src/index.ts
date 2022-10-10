const express = require('express');
import e from "cors";
import crypto from "crypto-js";
const path = require('path');
const expressApp = express();
const http = require('http');
const server = http.createServer(expressApp);
const { Server } = require("socket.io");
const io = new Server(server);
var request = require("request");
let proxy = require('express-http-proxy')
var bodyParser = require('body-parser');
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(bodyParser.json())
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require("nodemailer");

var mysql = require('mysql2');
const urlencodedParser = express.urlencoded({ extended: false });

var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

expressApp.use(cors(corsOptions))
// Add headers before the routes are defined
// Add headers before the routes are defined
expressApp.use(function (req:any, res:any, next:any) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

const pool = mysql.createPool({
  connectionLimit: 80,
  host: '141.8.195.33',
  user: 'a0694848_initiative_accelerator',
  password: process.env.DB_PASSWORD,
  database: 'a0694848_initiative_accelerator',
  multipleStatements: true
});

expressApp.post('/api/auth', (req: any, res: any) => {
  const { email, password } = req.body;
  let login = `${email.split("@")[0]}_${uuidv4()}`
  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`email\`=${mysql.escape(email)} AND \`password\`=${mysql.escape(password)}`, function (err: any, result: any) {
    if (err) {
      res.send(err)
    } else {
      res.send(result)
    }
  })
})
expressApp.post('/api/reg', (req: any, res: any) => {
  const { first_name, second_name, email, birth, password } = req.body;
  let login = `${email.split("@")[0]}_${uuidv4()}`
  pool.query(`INSERT INTO \`users\` (\`birth\`, \`name\`,\`surname\`,\`email\`,\`login\`,\`password\`,\`id\`,\`role\`,\`score\`,\`token\`) VALUES (${mysql.escape(birth)},${mysql.escape(first_name)}, ${mysql.escape(second_name)}, ${mysql.escape(email)}, ${mysql.escape(login)}, ${mysql.escape(password)},'${uuidv4()}', 'Студент',0,'${uuidv4()}')`, function (err: any, result: any) {
    if (err) {
      res.send(err)
    } else {
      pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`email\`=${mysql.escape(email)} AND \`name\`=${mysql.escape(first_name)} AND \`surname\`=${mysql.escape(second_name)} AND \`login\`=${mysql.escape(login)}`, function (err: any, result: any) {
        if (err) {
          res.send(err)
        } else {
          res.send(result)
        }
      });
    }
  });
});



expressApp.post(`/api/award_user`, (req: any, res: any) => {
  const { token, initiative_id, user_id, penalty } = req.body;
  pool.query(`SELECT \`role\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err)
    } else {
      let role: string = result[0].role;
      if (role == "Администратор" || role == "Модератор") {
        pool.query(`SELECT \`income\` from \`initiatives\` WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
          if (err) {
            res.send(err)
          } else {
            let initiativeIncome: number = result[0].income;
            pool.query(`UPDATE \`users\` SET \`score\`=\`score\`+${initiativeIncome}${penalty ? `-${penalty}` : ``} WHERE \`id\`=${mysql.escape(user_id)}`, function (err: any, result: any) {
              if (err) {
                res.send(err)
              } else {

                pool.query(`DELETE FROM \`initiatives_results\` WHERE \`initiative_id\`=${mysql.escape(initiative_id)} AND \`user_id\`=${mysql.escape(user_id)}`, function (err: any, result: any) {
                  if (err) {
                    res.send(err)
                  } else {
                    res.send({ success: "true" })
                  }
                })
              }
            })
          }
        })
      }
    }
  })
});



expressApp.get("/api/get_global_rating", (req: any, res: any) => {
  pool.query(`SELECT DISTINCT \`score\` FROM \`users\` ORDER BY \`score\` DESC LIMIT 10`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let scores = result;
      pool.query(`SELECT \`name\`, \`surname\`, \`score\` FROM \`users\` WHERE \`score\`>${scores[scores.length - 1].score - 1} ORDER BY \`score\` DESC`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          res.send(result);
        }
      })
    }
  })
})

expressApp.post('/api/get_me', (req: any, res: any) => {
  try {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
      if (err) {
        res.send(err.message)
      } else {
        res.send(result[0])
      }

    })
  }
  catch (e: any) {
    res.send(e.message);
  }
});

expressApp.post("/api/get_taken_initiatives", (req: any, res: any) => {
  const { token } = req.body;
  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      let sql = `SELECT * FROM \`initiatives_taken\` INNER JOIN \`initiatives\` on \`initiatives_taken\`.\`initiative_id\`=\`initiatives\`.\`id\` WHERE user_id='${user.id}'`
      pool.query(sql, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          res.send(result)
        }
      })
    }
  })
})

expressApp.post("/api/get_completed_initiatives", (req: any, res: any) => {
  const { token } = req.body;
  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      let sql = `SELECT * FROM \`initiatives_completed\` INNER JOIN \`initiatives\` on \`initiatives_completed\`.\`initiative_id\`=\`initiatives\`.\`id\` WHERE user_id='${user.id}'`
      pool.query(sql, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          res.send(result)
        }
      })
    }
  })
})

expressApp.post("/api/get_initiatives", (req: any, res: any) => {
  const { token } = req.body;
  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let now = new Date().getTime();
      pool.query(`SELECT * FROM \`initiatives\` WHERE deadline_take>${now} AND users_limit>users_taken union SELECT * from \`initiatives\` WHERE deadline_take>${now} AND users_limit IS NULL`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          res.send(result)
        }
      })
    }
  })
})

expressApp.post("/api/start_initiative", (req: any, res: any) => {
  const { token, initiative_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      pool.query(`INSERT INTO \`initiatives_taken\` (\`initiative_id\`,\`user_id\`) VALUES ('${initiative_id}','${user.id}')`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          pool.query(`UPDATE \`initiatives\` SET \`users_taken\`=\`users_taken\`+1 WHERE \`id\`='${initiative_id}'`, function (err: any, result: any) {
            if (err) {
              res.send(err.message)
            } else {
              res.send(result)
            }
          })
          res.send(result)
        }
      })
    }
  })
})

expressApp.post("/api/get_personal_rating", (req: any, res: any) => {
  const { token } = req.body;
  pool.query(`SET @rank=0;SET @userScore = (SELECT \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}); SELECT \`position\`,\`score\` FROM ( SELECT @rank:=@rank+1 AS \`position\`, \`token\`, \`score\` FROM ( SELECT \`score\`, \`token\` FROM \`users\` ORDER BY \`score\` DESC ) as t1 ) as t2  WHERE \`score\` = @userScore ORDER BY \`position\` ASC LIMIT 1;`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      res.send(result[2][0])
    }
  })
})






server.listen(process.env.PORT || 5000, () => {
  console.log(`listening on *:${process.env.PORT || 5000}`);
});