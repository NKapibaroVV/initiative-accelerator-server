const express = require('express');
import axios from "axios";
import e from "cors";
import crypto, { SHA512 } from "crypto-js";
import { env } from "process";
import { SendServiceEmail } from "./Mailer";
import { telegramBot } from "./tgBot";
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

var mysql = require('mysql2');
const urlencodedParser = express.urlencoded({ extended: false });

const tgBot = new telegramBot();

SendServiceEmail.sendText({ recipient: process.env.SERVICE_EMAIL!, subject: "Системное сообщение о запуске", text: `Выполнен запуск сервера в ${new Date().toLocaleString()}` })

// Add headers before the routes are defined
expressApp.use(function (req: any, res: any, next: any) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const pool = mysql.createPool({
  connectionLimit: 15,
  host: 'f0711974.xsph.ru',
  user: 'f0711974_initiative_accelerator',
  password: process.env.DB_PASSWORD,
  database: 'f0711974_initiative_accelerator',
  multipleStatements: true
});

console.log(pool)

expressApp.post('/api/auth/', (req: any, res: any) => {
  const { email, password } = req.body;
  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`email_verified\`=1 AND \`email\`=${mysql.escape(email)} AND \`password\`=${mysql.escape(SHA512(password).toString())}`, function (err: any, result: any) {
    if (err) {
      res.send(err)
    } else {
      res.send(result)
    }
  })
})

expressApp.post('/api/reg/', (req: any, res: any) => {
  const { first_name, second_name, email, birth, password } = req.body;
  let login = `${email.split("@")[0]}_${uuidv4()}`
  let new_user_id: string = uuidv4();
  addVerifCode(email, new_user_id).then(() => {
    pool.query(`INSERT INTO \`users\` (\`birth\`, \`name\`,\`surname\`,\`email\`,\`login\`,\`password\`,\`id\`,\`role\`,\`score\`,\`token\`) VALUES (${mysql.escape(birth)},${mysql.escape(first_name)}, ${mysql.escape(second_name)}, ${mysql.escape(email)}, ${mysql.escape(login)}, ${mysql.escape(SHA512(password).toString())},'${new_user_id}', 'Студент',0,'${uuidv4()}')`, function (err: any, result: any) {
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
  })
});

expressApp.post("/api/get_user/", (req: any, res: any) => {
  const { token, user_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];

      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`SELECT * FROM \`users\` WHERE \`id\`=${mysql.escape(user_id)}`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send()
      }
    }
  })
})

expressApp.post("/api/update_user/", (req: any, res: any) => {
  const { token, user_id, name, surname, email, edu_group, birth, role } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];

      if (!!user&&!!user.role&&user.role == "Администратор") {
        pool.query(`UPDATE \`users\` SET \`name\`=${mysql.escape(name)}, \`surname\`=${mysql.escape(surname)}, \`email\`=${mysql.escape(email)}, \`edu_group\`=${mysql.escape(edu_group)}, \`birth\`=${mysql.escape(birth)}, \`role\`=${mysql.escape(role)} WHERE \`id\`='${user_id}'`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send()
      }
    }
  })
})

expressApp.post("/api/reset_user_password/", (req: any, res: any) => {
  const { token, user_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (!!user&&!!user.role&&user.role == "Администратор") {
        let newPassword = `${uuidv4().split("-")[0]}-${uuidv4().split("-")[1]}-${uuidv4().split("-")[0]}`
        pool.query(`UPDATE \`users\` SET \`password\`=${mysql.escape(SHA512(newPassword).toString())}, \`token\`=${mysql.escape(uuidv4())} WHERE \`id\`=${mysql.escape(user_id)}`, function (err: any, res: any) {
          if (err) {
            res.send(err.message)
          } else {
            pool.query(`SELECT \`email\` FROM \`users\` WHERE \`id\`=${mysql.escape(user_id)}`, function (err: any, resultuser: any) {
              if (err) {
                res.send(err.message)
              } else {
                let client = resultuser[0];
                res.send({ newPassword: "Пароль отправлен на почту пользователя"+`(${client.email})` })

                SendServiceEmail.sendText({subject:"Восстановление пароля администратором",recipient:client.email,text:"Ваш новый пароль для входа: "+newPassword+"\n!ОБЯЗАТЕЛЬНО СМЕНИТЕ ПАРОЛЬ ПОСЛЕ АВТОРИЗАЦИИ!\n\nПароль сбросил администратор "+user.login})

              }
            })
          }
        })
      } else {
        res.send()
      }
    }
  })
})

expressApp.post(`/api/get_all_users/`, (req: any, res: any) => {
  const { token } = req.body;
  pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err)
    } else {
      let user: any = result[0];
      let role: string = user.role;

      if (role == "Администратор" || role == "Модератор") {
        pool.query(`SELECT * from \`users\` WHERE 1 ORDER BY \`surname\` ASC`, function (err: any, result: any) {
          if (err) {
            res.send(err)
          } else {
            res.send(result)
          }
        })
      }
    }
  })
});

expressApp.post(`/api/get_shop_item_stat/`, (req: any, res: any) => {
  const { token, item_id } = req.body;
  pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err)
    } else {
      let user: any = result[0];
      let role: string = user.role;

      if (role == "Администратор" || role == "Модератор") {
        pool.query(`SELECT * from \`shop_logs\` JOIN \`users\` ON \`shop_logs\`.\`user_id\`=\`users\`.\`id\` WHERE \`shop_item_id\`=${mysql.escape(item_id)}`, function (err: any, result: any) {
          if (err) {
            res.send(err)
          } else {
            res.send(result)
          }
        })
      }
    }
  })
});

expressApp.post(`/api/award_user/`, (req: any, res: any) => {
  const { token, initiative_id, user_id, penalty } = req.body;
  pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err)
    } else {
      let user: any = result[0];
      let role: string = user.role;

      if (role == "Администратор" || role == "Модератор") {
        pool.query(`SELECT \`income\` from \`initiatives\` WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
          if (err) {
            res.send(err)
          } else {
            let initiativeIncome: number = result[0].income;
            addAdminLog(user.id, `USER AWARDED {'user_awarded_id':${mysql.escape(user_id)},'penalty':${mysql.escape(penalty)},'initiative_id':${mysql.escape(initiative_id)}}`).then(() => {
              pool.query(`UPDATE \`users\` SET \`score\`=\`score\`+${initiativeIncome}${penalty ? `-${penalty}` : ``} WHERE \`id\`=${mysql.escape(user_id)}`, function (err: any, result: any) {
                if (err) {
                  res.send(err)
                } else {
                  pool.query(`UPDATE \`initiatives_completed\` SET checked=1 where initiative_id='${initiative_id}' AND user_id='${user_id}'`, function (err: any, result: any) {
                    if (err) {
                      res.send(err)
                    } else {
                      res.send({ success: "true" })
                    }
                  })
                }
              })
            })
          }
        })
      }
    }
  })
});



expressApp.get("/api/get_global_rating/", (req: any, res: any) => {
  pool.query(`SELECT DISTINCT \`score\` FROM \`users\` ORDER BY \`score\` DESC LIMIT 10`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let scores = result;
      pool.query(`SELECT \`name\`, \`surname\`, \`score\`, \`avatarURI\` FROM \`users\` WHERE \`score\`>${scores[scores.length - 1].score - 1} ORDER BY \`score\` DESC`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          res.send(result);
        }
      })
    }
  })
})

expressApp.post('/api/get_me/', (req: any, res: any) => {
  try {
    const { token } = req.body;
    pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
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

expressApp.post("/api/get_rank/", (req: any, res: any) => {
  const { token } = req.body;

  //SELECT SUM(cost) FROM \`shop_logs\` INNER JOIN \`shop_items\` ON \`shop_logs\`.\`shop_item_id\`=\`shop_items\`.\`id\` WHERE \`shop_logs\`.\`user_id\`='88db4263-6ccc-4af0-b4ac-850db6b49edd';


  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];

      pool.query(`SELECT SUM(cost) as rank, COUNT(cost) as count FROM \`shop_logs\` INNER JOIN \`shop_items\` ON \`shop_logs\`.\`shop_item_id\`=\`shop_items\`.\`id\` WHERE \`shop_logs\`.\`user_id\`=${mysql.escape(user.id)}`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          let rank = result[0].rank;
          let count = result[0].count;
          res.json({ rank: Math.floor(((((rank * count) / 5) * 0.35) + (count / 3 | 0) + count) * 10) });
        }
      })
    }
  })
})

expressApp.post("/api/update_profile/", (req: any, res: any) => {
  const { token, name, surname, email, edu_group, birth, password, avatar } = req.body;
  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      let avatarURI: string | null = null;
      if (/http.?:\/\/.*\.(jpg|png)/g.test(avatar)) {
        avatarURI = avatar;
      }
      let sql = `UPDATE \`users\` SET \`name\`=${mysql.escape(name)}, \`surname\`=${mysql.escape(surname)}, \`email\`=${mysql.escape(email)}, \`edu_group\`=${mysql.escape(edu_group)}, \`birth\`=${mysql.escape(birth)}${!!password ? `, \`password\`=${mysql.escape(password)}` : ""}${!!avatarURI ? `, \`avatarURI\`=${mysql.escape(avatar)}` : ""} WHERE \`id\`='${user.id}'`
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

expressApp.post("/api/get_taken_initiatives/", (req: any, res: any) => {
  const { token } = req.body;
  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      let sql = "";
      if (!!user && !!user.id) {
        sql = `SELECT * FROM \`initiatives_taken\` INNER JOIN \`initiatives\` on \`initiatives_taken\`.\`initiative_id\`=\`initiatives\`.\`id\` INNER JOIN \`initiative_conversations\` ON \`initiative_conversations\`.\`initiative_id\`=\`initiatives\`.\`id\` WHERE user_id='${user.id}'`
      }
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

expressApp.post("/api/get_completed_initiatives/", (req: any, res: any) => {
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

expressApp.post("/api/get_initiatives/", (req: any, res: any) => {
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

expressApp.post("/api/start_initiative/", (req: any, res: any) => {
  const { token, initiative_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message);
    } else {
      let user = result[0];
      pool.query(`SELECT * FROM \`initiatives\` WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          let initiative = result[0]
          if (initiative.users_limit == null || initiative.users_limit > initiative.users_taken) {
            pool.query(`INSERT INTO \`initiatives_taken\` (\`identifer\`,\`initiative_id\`,\`user_id\`) VALUES (${mysql.escape(`${user.id}_${initiative_id}`)},${mysql.escape(initiative_id)},${mysql.escape(user.id)})`, function (err: any, result: any) {
              if (err) {
                res.send(err.message)
              } else {
                pool.query(`UPDATE \`initiatives\` SET \`users_taken\`=\`users_taken\`+1 WHERE \`id\`='${initiative_id}'`, function (err: any, result: any) {
                  if (err) {
                    res.send(err.message)
                  } else {
                    res.send("Вы успешно приступили к выполнению задания!")
                  }
                })
              }
            })
          } else {
            res.send("Достигнуто ограничение на кол-во мест!")
          }
        }
      })
    }
  })
})

expressApp.post("/api/complete_initiative/", (req: any, res: any) => {
  const { token, initiative_id, comment } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      pool.query(`INSERT INTO \`initiatives_completed\` (\`identifer\`,\`initiative_id\`,\`user_id\`,\`comment\`,\`checked\`) VALUES (${mysql.escape(`${user.id}_${initiative_id}`)},${mysql.escape(initiative_id)},${mysql.escape(user.id)},${mysql.escape(comment)},0)`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          res.send()
        }
      })
    }
  })
})

expressApp.post("/api/get_initiatives_results/", (req: any, res: any) => {
  const { token } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`SELECT DISTINCT * FROM \`initiatives_completed\` JOIN \`initiatives\` on \`id\`=\`initiative_id\` WHERE \`checked\`=0 GROUP BY \`initiative_id\``, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send()
      }
    }
  })
})


expressApp.post("/api/get_initiative_results/", (req: any, res: any) => {
  const { token, initiative_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`SELECT * FROM \`initiatives_completed\` JOIN \`initiatives\` on \`id\`=\`initiative_id\` JOIN \`users\` on \`user_id\`=\`users\`.\`id\` WHERE \`initiative_id\`='${initiative_id}' AND \`checked\`=0`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send()
      }
    }
  })
})

expressApp.post("/api/add_initiative/", (req: any, res: any) => {
  const { token, title, income, take_deadline, complete_deadline, content, category, users_limit, isPrivate }: { token: string, title: string, income: number, take_deadline: number, complete_deadline: number, content: string, category: string, users_limit: number, isPrivate?: boolean } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      let initiative_identifer = uuidv4();
      if (user.role == "Администратор" || user.role == "Модератор") {
        let chatName = `${title} (${category}) (до ${new Date(complete_deadline).toLocaleString()})`
        axios(`https://api.vk.com/method/messages.createChat?title=${chatName}&access_token=${process.env.VK_ACCESS_TOKEN}&v=5.131`).then(response => {
          console.log(response.data)
          let chatId = response.data.response
          axios(`https://api.vk.com/method/messages.getInviteLink?peer_id=${2000000000 + Number.parseInt(chatId)}&access_token=${process.env.VK_ACCESS_TOKEN}&v=5.131`).then(response => {
            console.log(response.data);
            let link = response.data.response.link;

            pool.query(`INSERT INTO \`initiative_conversations\` (\`initiative_id\`, \`link\`) VALUES ('${initiative_identifer}', ${mysql.escape(link)})`, function (err: any, result: any) {
              if (err) {
                res.send(err.message);
              } else {
                pool.query(`INSERT INTO \`initiatives\` (\`id\`, \`category\`, \`title\`, \`content\`, \`income\`, \`deadline_take\`, \`deadline_complete\`, \`users_limit\`, \`users_taken\`) VALUES ('${initiative_identifer}', ${mysql.escape(category)}, ${mysql.escape(title)}, ${mysql.escape(content)}, ${mysql.escape(income)}, ${mysql.escape(take_deadline)}, ${mysql.escape(complete_deadline)}, ${!!users_limit ? mysql.escape(users_limit) : "NULL"}, 0)`, function (err: any, result: any) {
                  if (err) {
                    res.send(err.message);
                  } else {
                    addAdminLog(user.id, `USER CREATED INITIATIVE {'params':${mysql.escape(JSON.stringify({ title, income, take_deadline, complete_deadline, content, category, users_limit, isPrivate }))}}`).then(() => {
                      pool.query(`SELECT * FROM \`initiatives\` WHERE \`id\`='${initiative_identifer}'`, function (err: any, result: any) {
                        if (err) {
                          res.send(err.message)
                        } else {
                          res.send(result);
                          if (!isPrivate) {

                            tgBot.sendMessage("@mospedreserv",
                              `
В *[акселераторе инициатив](https://initiative-accelerator-front-alexc-ux.vercel.app/cab/)* новое задание \\!

Название: *${telegramBot.escapeMarkdown(title)}*
Категория:*${telegramBot.escapeMarkdown(category)}*
Мест: *${!!users_limit ? users_limit : "Не ограничено"}*
Можно начать выполнять до: *${!!take_deadline ? new Date(take_deadline).toLocaleString() : "Не ограничено"}*
Нужно выполнить до: *${!!complete_deadline ? new Date(complete_deadline).toLocaleString() : "Не ограничено"}*
Награда: *${income} баллов*

*Описание:*
${telegramBot.escapeMarkdown(content)}

Для того, чтобы принять участие в этом задании, перейдите в [личный кабинет](https://initiative-accelerator-front-alexc-ux.vercel.app/cab/#brick_${initiative_identifer})\\.

P\\.S\\.
Задание будет отображаться у всех пользователей до тех пор, пока к его выполнению возможно приступить\\.
`
                              , "MarkdownV2", false, true);
                          }
                        }
                      })
                    })
                  }
                })
              }
            })
          })
        })
      } else {
        res.send("Wrong user role");
      }
    }
  })
})

expressApp.post("/api/update_initiative/", (req: any, res: any) => {
  const { token, initiative_id, title, income, take_deadline, complete_deadline, content, category, users_limit } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`UPDATE \`initiatives\`  SET  \`category\`=${mysql.escape(category)}, \`title\`=${mysql.escape(title)}, \`content\`=${mysql.escape(content)}, \`income\`=${mysql.escape(income)}, \`deadline_take\`=${mysql.escape(take_deadline)}, \`deadline_complete\`=${mysql.escape(complete_deadline)}, \`users_limit\`=${!!users_limit ? mysql.escape(users_limit) : "NULL"} WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send("Wrong user role")
      }
    }
  })
})

expressApp.post("/api/completely_delete_initiative/", (req: any, res: any) => {
  const { token, initiative_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (!!user&&!!user.role&&user.role == "Администратор") {
        addAdminLog(user.id, `USER DELETED INITIATIVE {'id':'${initiative_id}}'}`).then(() => {
          pool.query(`DELETE FROM \`initiatives\` WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
            if (err) {
              res.send(err.message)
            } else {
              pool.query(`DELETE FROM \`initiatives_completed\` WHERE \`initiative_id\`=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
                if (err) {
                  res.send(err.message)
                } else {
                  pool.query(`DELETE FROM \`initiatives_taken\` WHERE \`initiative_id\`=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
                    if (err) {
                      res.send(err.message)
                    } else {
                      pool.query(`UPDATE \`initiatives\` SET users_taken=users_taken-1 WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
                        if (err) {
                          res.send(err.message)
                        } else {
                          res.send(result)
                        }
                      })
                    }
                  })
                }
              })
            }
          })
        })
      } else {
        res.send("Wrong user role")
      }
    }
  })
})

expressApp.post("/api/get_all_initiatives/", (req: any, res: any) => {
  const { token } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`SELECT * FROM  \`initiatives\``, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send("Wrong user role")
      }
    }
  })
})

expressApp.post("/api/get_initiative_params/", (req: any, res: any) => {
  const { token, initiative_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`SELECT * FROM \`initiatives\` WHERE \`id\`='${initiative_id}'`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send("Wrong user role")
      }
    }
  })
})

expressApp.post("/api/get_initiative_members/", (req: any, res: any) => {
  const { token, initiative_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];

      let taken: any[] = [];
      let completed: any[] = [];

      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`SELECT * FROM initiatives_taken INNER JOIN initiatives on initiatives_taken.initiative_id=initiatives.id INNER JOIN users ON users.id=initiatives_taken.user_id WHERE initiatives_taken.initiative_id=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            taken = result;
            pool.query(`SELECT * FROM initiatives_completed INNER JOIN initiatives on initiatives_completed.initiative_id=initiatives.id INNER JOIN users ON users.id=initiatives_completed.user_id WHERE initiatives_completed.initiative_id=${mysql.escape(initiative_id)}`, function (err: any, result: any) {
              if (err) {
                res.send(err.message)
              } else {

                function removeEmpty(array: any[]) {
                  let result = array.filter(element => {
                    return element !== null;
                  });
                  return result
                }

                completed = result;
                taken.forEach(takenRow => {
                  completed.forEach(completedRow => {
                    if (completedRow.user_id == takenRow.user_id) {
                      delete taken[taken.indexOf(takenRow)];
                    }
                  });
                });
                taken = removeEmpty(taken);
                completed = removeEmpty(completed);
                res.send([...completed, ...taken])
              }
            })
          }
        })
      } else {
        res.send("Wrong user role")
      }
    }
  })
})

expressApp.post("/api/get_all_shop_items/", (req: any, res: any) => {
  const { token } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`SELECT * FROM \`shop_items\``, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send("Wrong user role")
      }
    }
  })
})

expressApp.post("/api/get_shop_item_params/", (req: any, res: any) => {
  const { token, item_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`SELECT * FROM \`shop_items\` WHERE \`id\`='${item_id}'`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send("Wrong user role")
      }
    }
  })
})

expressApp.post("/api/get_personal_rating/", (req: any, res: any) => {
  const { token } = req.body;
  pool.query(`SET @rank=0;SET @userScore = (SELECT \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}); SELECT \`position\`,\`score\` FROM ( SELECT @rank:=@rank+1 AS \`position\`, \`token\`, \`score\` FROM ( SELECT \`score\`, \`token\` FROM \`users\` ORDER BY \`score\` DESC ) as t1 ) as t2  WHERE \`score\` = @userScore ORDER BY \`position\` ASC LIMIT 1;`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      res.send(result[2][0])
    }
  })
})


expressApp.post("/api/add_shop_item/", (req: any, res: any) => {
  const { token, cost, title, description, deadline_take, users_limit } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`INSERT INTO \`shop_items\` (\`id\`, \`cost\`, \`title\`, \`description\`, \`deadline_take\`, \`users_limit\`, \`users_taken\`) VALUES (NULL, ${mysql.escape(cost)}, ${mysql.escape(title)}, ${mysql.escape(description)}, ${!!deadline_take ? mysql.escape(deadline_take) : "NULL"}, ${!!users_limit ? mysql.escape(users_limit) : "NULL"}, '0');`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send()
      }
    }
  })
})

expressApp.post("/api/update_shop_item/", (req: any, res: any) => {
  const { token, cost, title, description, deadline_take, users_limit, item_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      if (user.role == "Администратор" || user.role == "Модератор") {
        pool.query(`UPDATE \`shop_items\` SET \`cost\`=${mysql.escape(cost)}, \`title\`=${mysql.escape(title)}, \`description\`=${mysql.escape(description)}, \`deadline_take\`=${!!deadline_take ? mysql.escape(deadline_take) : "NULL"}, \`users_limit\`=${!!users_limit ? mysql.escape(users_limit) : "NULL"} WHERE \`id\`=${mysql.escape(item_id)};`, function (err: any, result: any) {
          if (err) {
            res.send(err.message)
          } else {
            res.send(result)
          }
        })
      } else {
        res.send()
      }
    }
  })
})

expressApp.get("/api/get_shop_items/", (req: any, res: any) => {
  let now = new Date().getTime()

  pool.query(`SELECT * FROM \`shop_items\` WHERE \`deadline_take\` IS NULL AND \`users_limit\`>\`users_taken\` UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\`>${now} AND \`users_limit\` IS NULL UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\` IS NULL AND \`users_limit\` IS NULL UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\`>${now} AND \`users_limit\`>\`users_taken\``, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      res.send(result)
    }
  })
}
)

expressApp.post("/api/buy_shop_item/", (req: any, res: any) => {
  const { token, shop_item_id } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      pool.query(`SELECT * FROM \`shop_items\` WHERE \`id\`=${mysql.escape(shop_item_id)}`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          let shopItem = result[0];
          let now = new Date().getTime();

          if (user.score - shopItem.cost >= 0) {
            if (shopItem.users_limit == null || shopItem.users_taken < shopItem.users_limit) {
              pool.query(`INSERT INTO \`shop_logs\` (\`identifer\`, \`shop_item_id\`,\`user_id\`,\`time\`) VALUES (NULL, ${mysql.escape(shop_item_id)}, '${user.id}', ${now})`, function (err: any, result: any) {
                if (err) {
                  res.send(err.message)
                } else {
                  pool.query(`UPDATE \`users\` SET \`score\`=\`score\`-${shopItem.cost} WHERE \`id\`='${user.id}'`, function (err: any, result: any) {
                    if (err) {
                      res.send(err.message)
                    } else {
                      pool.query(`UPDATE \`shop_items\` SET \`users_taken\`=\`users_taken\`+1 WHERE \`id\`='${mysql.escape(shop_item_id)}'`, function (err: any, result: any) {
                        if (err) {
                          res.send(err.message)
                        } else {
                          res.send("Обмен баллов прошел успешно!");
                        }
                      })
                    }
                  })
                }
              })
            } else {
              res.send("Достигнуто ограничение по количеству!")
            }
          } else {
            res.send("У Вас недостаточно баллов!");
          }
        }
      })
    }
  })
})

expressApp.post("/api/get_my_shop_logs/", (req: any, res: any) => {
  const { token } = req.body;

  pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err: any, result: any) {
    if (err) {
      res.send(err.message)
    } else {
      let user = result[0];
      pool.query(`SELECT * FROM \`shop_logs\` JOIN \`shop_items\` ON \`shop_items\`.\`id\`=\`shop_logs\`.\`shop_item_id\` WHERE  \`shop_logs\`.\`user_id\`='${user.id}' ORDER BY \`shop_logs\`.\`time\` DESC`, function (err: any, result: any) {
        if (err) {
          res.send(err.message)
        } else {
          res.send(result)
        }
      })
    }
  })
})


server.listen(process.env.PORT || 5000, () => {
  console.log(`listening on *:${process.env.PORT || 5000}`);
});

function addAdminLog(userId: string, message: string) {
  return new Promise(function (resolve, reject) {
    pool.query(`INSERT INTO admin_logs (\`id\`, \`time\`,\`user\`,\`message\`) VALUES ('${uuidv4()}','${new Date().getTime()}', ${mysql.escape(userId)}, ${mysql.escape(message)})`, function (err: any, result: any) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    })
  });
}

function addVerifCode(email: string, user_id: string) {
  const code: string = uuidv4();

  return new Promise(function (resolve, reject) {
    pool.query(`INSERT INTO \`account_verif_codes\` (\`id\`,\`mail\`,\`code\`,\`user_id\`,\`activated\`) VALUES (${mysql.escape(uuidv4())},${mysql.escape(email)},${mysql.escape(code)}, ${mysql.escape(user_id)}, 0)`, function (err: any, result: any) {
      if (err) {
        reject(err);
      } else {
        SendServiceEmail.sendText({ recipient: email, subject: "Подтверждение регистрации | Акселератор инициатив", text: `Ваш код подтверждения: ${code}` })
        resolve(code);
      }
    })
  })

}