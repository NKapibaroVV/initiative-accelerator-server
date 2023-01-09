"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const axios_1 = __importDefault(require("axios"));
const crypto_js_1 = require("crypto-js");
const Mailer_1 = require("./Mailer");
const tgBot_1 = require("./tgBot");
const path = require('path');
const expressApp = express();
const http = require('http');
const server = http.createServer(expressApp);
const { Server } = require("socket.io");
const io = new Server(server);
var request = require("request");
let proxy = require('express-http-proxy');
var bodyParser = require('body-parser');
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(bodyParser.json());
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
var mysql = require('mysql2');
const urlencodedParser = express.urlencoded({ extended: false });
const tgBot = new tgBot_1.telegramBot();
let vk_token = process.env.VK_ACCESS_TOKEN;
// Add headers before the routes are defined
expressApp.use(function (req, res, next) {
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
console.log(pool);
expressApp.get('/', (req, res) => {
    res.send("api");
});
expressApp.post('/api/auth/', (req, res) => {
    const { email, password } = req.body;
    pool.query(`SELECT * FROM \`users\` WHERE \`email\`=${mysql.escape(email)} AND \`password\`=${mysql.escape((0, crypto_js_1.SHA512)(password).toString())}`, function (err, result) {
        if (err) {
            res.send(err);
        }
        else {
            res.send(result);
        }
    });
});
expressApp.post('/api/reg/', (req, res) => {
    const { first_name, second_name, email, birth, password } = req.body;
    let login = `${email.split("@")[0]}_${uuidv4()}`;
    let new_user_id = uuidv4();
    addVerifCode(email, new_user_id, req.get('origin')).then(() => {
        pool.query(`INSERT INTO \`users\` (\`birth\`, \`name\`,\`surname\`,\`email\`,\`login\`,\`password\`,\`id\`,\`role\`,\`score\`,\`token\`) VALUES (${mysql.escape(birth)},${mysql.escape(first_name)}, ${mysql.escape(second_name)}, ${mysql.escape(email)}, ${mysql.escape(login)}, ${mysql.escape((0, crypto_js_1.SHA512)(password).toString())},'${new_user_id}', 'Студент',0,'${uuidv4()}')`, function (err, result) {
            if (err) {
                res.send(err);
            }
            else {
                pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`email\`=${mysql.escape(email)} AND \`name\`=${mysql.escape(first_name)} AND \`surname\`=${mysql.escape(second_name)} AND \`login\`=${mysql.escape(login)}`, function (err, result) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
        });
    });
});
expressApp.post('/api/email/verif', (req, res) => {
    const { id, code } = req.body;
    pool.query(`SELECT * FROM \`account_verif_codes\` WHERE \`id\`=${mysql.escape(id)} AND \`code\`=${mysql.escape(code)}`, function (err, result) {
        if (err) {
            res.send(err);
        }
        else {
            if (!!result && !!result[0] && !!result[0].mail) {
                let newMail = result[0].mail;
                let userId = result[0].user_id;
                pool.query(`UPDATE \`account_verif_codes\` SET \`activated\`=1 WHERE \`id\`=${mysql.escape(id)} AND \`code\`=${mysql.escape(code)}`, function (err, reslt) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        pool.query(`UPDATE \`users\` SET \`email\`=${mysql.escape(newMail)}, \`email_verified\`=1 WHERE \`id\`=${mysql.escape(userId)}`, function (err, reslt) {
                            if (err) {
                                res.send(err);
                            }
                            else {
                                res.send({ msg: `Email ${newMail} подтверждён!` });
                            }
                        });
                    }
                });
            }
            else {
                res.send({ error: "wrong id/code" });
            }
        }
    });
});
expressApp.post("/api/get_user/", (req, res) => {
    const { token, user_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT * FROM \`users\` WHERE \`id\`=${mysql.escape(user_id)}`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post("/api/get_user/", (req, res) => {
    const { token, user_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT * FROM \`users\` WHERE \`id\`=${mysql.escape(user_id)}`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post("/api/editScoreByDeltaScore/", (req, res) => {
    const { token, user_id, cost_delta, cost_delta_comment, action } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`UPDATE \`users\` SET \`score\`=\`score\`${action == "add" ? "+" : "-"}${mysql.escape(cost_delta)}, \`notifs_checked\`=0 WHERE \`id\`=${mysql.escape(user_id)}`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        pool.query(`INSERT INTO \`notifications\` (\`time\`, \`title\`,\`text\`,\`user\`) VALUES (${Date.now()}, "${action == "add" ? "+" : "-"}${mysql.escape(cost_delta)} баллов", ${mysql.escape(cost_delta_comment)}, ${mysql.escape(user_id)})`, function (err, result) {
                            if (err) {
                                res.send(err.message);
                            }
                            else {
                                res.send(result);
                            }
                        });
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post("/api/getNotifs/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            pool.query(`SELECT * FROM \`notifications\` WHERE \`user\`='${user.id}' OR \`user\` is NULL ORDER BY \`time\` ASC`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
});
expressApp.post("/api/checkNotifs/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            pool.query(`UPDATE \`users\` SET \`notifs_checked\`=1 WHERE \`id\`=${mysql.escape(user.id)}`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
});
expressApp.post("/api/update_user/", (req, res) => {
    const { token, user_id, name, surname, email, edu_group, birth, role } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && user.role == "Администратор") {
                pool.query(`UPDATE \`users\` SET \`name\`=${mysql.escape(name)}, \`surname\`=${mysql.escape(surname)}, \`email\`=${mysql.escape(email)}, \`edu_group\`=${mysql.escape(edu_group)}, \`birth\`=${mysql.escape(birth)}, \`role\`=${mysql.escape(role)} WHERE \`id\`='${user_id}'`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post("/api/reset_user_password/", (req, res) => {
    const { token, user_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && user.role == "Администратор") {
                let newPassword = `${uuidv4().split("-")[0]}-${uuidv4().split("-")[1]}-${uuidv4().split("-")[0]}`;
                pool.query(`UPDATE \`users\` SET \`password\`=${mysql.escape((0, crypto_js_1.SHA512)(newPassword).toString())}, \`token\`=${mysql.escape(uuidv4())} WHERE \`id\`=${mysql.escape(user_id)}`, function (err, reslt) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        pool.query(`SELECT \`email\` FROM \`users\` WHERE \`id\`=${mysql.escape(user_id)}`, function (err, resultuser) {
                            if (err) {
                                res.send(err.message);
                            }
                            else {
                                let client = resultuser[0];
                                addAdminLog(user.id, `USER PASSWORD RESETED {"user_id":"${client.id}"}`).then(() => {
                                    Mailer_1.SendServiceEmail.sendText({ subject: "Восстановление пароля администратором", recipient: client.email, text: "Ваш новый пароль для входа: " + newPassword + "\n!ОБЯЗАТЕЛЬНО СМЕНИТЕ ПАРОЛЬ ПОСЛЕ АВТОРИЗАЦИИ!\n\nПароль сбросил администратор " + user.login })
                                        .then(() => {
                                        res.send({ newPassword: "Пароль отправлен на почту пользователя" + `(${client.email})` });
                                    });
                                });
                            }
                        });
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post(`/api/get_all_users/`, (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err);
        }
        else {
            let user = result[0];
            let role = user.role;
            if (!!role && role == "Администратор" || role == "Модератор") {
                pool.query(`SELECT * from \`users\` WHERE 1 ORDER BY \`score\` DESC`, function (err, result) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
        }
    });
});
expressApp.post(`/api/get_shop_item_users/`, (req, res) => {
    const { token, item_id } = req.body;
    pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err);
        }
        else {
            let user = result[0];
            let role = user.role;
            if (!!role && role == "Администратор" || role == "Модератор") {
                pool.query(`SELECT * from \`shop_items\` WHERE \`id\`=${mysql.escape(item_id)}`, function (err, shopItem) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        pool.query(`SELECT * from \`shop_items\` JOIN \`users\` ON \`shop_items\.\`user_id\`=\`users\`.\`id\`  WHERE \`shop_items\`.\`title\`='${shopItem.title}' AND \`shop_items\`.\`cost\`=${shopItem.cost} AND \`shop_items\`.\`description\`='${shopItem.description}' AND \`shop_items\`.\`deadline_take\`=${shopItem.deadline_take} AND \`shop_items\`.\`users_limit\`=${shopItem.users_limit}`, function (err, result) {
                            if (err) {
                                res.send(err);
                            }
                            else {
                                res.send(result);
                            }
                        });
                    }
                });
            }
        }
    });
});
expressApp.post(`/api/get_shop_item_stat/`, (req, res) => {
    const { token, item_id } = req.body;
    pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err);
        }
        else {
            let user = result[0];
            let role = user.role;
            if (!!role && role == "Администратор" || role == "Модератор") {
                pool.query(`SELECT * from \`shop_logs\` JOIN \`users\` ON \`shop_logs\`.\`user_id\`=\`users\`.\`id\` WHERE \`shop_item_id\`=${mysql.escape(item_id)}`, function (err, result) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
        }
    });
});
expressApp.post(`/api/award_user/`, (req, res) => {
    const { token, initiative_id, user_id, penalty } = req.body;
    pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err);
        }
        else {
            let user = result[0];
            let role = user.role;
            if (!!role && role == "Администратор" || role == "Модератор") {
                pool.query(`SELECT \`income\` from \`initiatives\` WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err, result) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        let initiativeIncome = result[0].income;
                        addAdminLog(user.id, `USER AWARDED {'user_awarded_id':${mysql.escape(user_id)},'penalty':${mysql.escape(penalty)},'initiative_id':${mysql.escape(initiative_id)}}`).then(() => {
                            pool.query(`UPDATE \`users\` SET \`score\`=\`score\`+${initiativeIncome}${penalty ? `-${penalty}` : ``} WHERE \`id\`=${mysql.escape(user_id)}`, function (err, result) {
                                if (err) {
                                    res.send(err);
                                }
                                else {
                                    pool.query(`UPDATE \`initiatives_completed\` SET checked=1 where initiative_id='${initiative_id}' AND user_id='${user_id}'`, function (err, result) {
                                        if (err) {
                                            res.send(err);
                                        }
                                        else {
                                            res.send({ success: "true" });
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            }
        }
    });
});
expressApp.get("/api/get_global_rating/", (req, res) => {
    pool.query(`SELECT DISTINCT \`score\` FROM \`users\` ORDER BY \`score\` DESC LIMIT 20`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let scores = result;
            pool.query(`SELECT \`name\`, \`surname\`, \`score\`, \`avatarURI\` FROM \`users\` WHERE \`score\`>${scores[scores.length - 1].score - 1} ORDER BY \`score\` DESC`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
});
expressApp.post('/api/get_me/', (req, res) => {
    try {
        const { token } = req.body;
        pool.query(`SELECT * FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
            if (err) {
                res.send(err.message);
            }
            else {
                res.send(result[0]);
            }
        });
    }
    catch (e) {
        res.send(e.message);
    }
});
expressApp.post("/api/get_rank/", (req, res) => {
    const { token } = req.body;
    //SELECT SUM(cost) FROM \`shop_logs\` INNER JOIN \`shop_items\` ON \`shop_logs\`.\`shop_item_id\`=\`shop_items\`.\`id\` WHERE \`shop_logs\`.\`user_id\`='88db4263-6ccc-4af0-b4ac-850db6b49edd';
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            pool.query(`SELECT SUM(cost) as rank, COUNT(cost) as count FROM \`shop_logs\` INNER JOIN \`shop_items\` ON \`shop_logs\`.\`shop_item_id\`=\`shop_items\`.\`id\` WHERE \`shop_logs\`.\`user_id\`=${mysql.escape(user.id)}`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    let rank = result[0].rank;
                    let count = result[0].count;
                    res.json({ rank: Math.floor(((((rank * count) / 5) * 0.35) + (count / 3 | 0) + count) * 10) });
                }
            });
        }
    });
});
expressApp.post("/api/update_profile/", (req, res) => {
    const { token, name, surname, email, edu_group, birth, password, avatar } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\`, \`email\`, \`password\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            let avatarURI = null;
            if (/http.?:\/\/.*\.(jpg|png)/g.test(avatar)) {
                avatarURI = avatar;
            }
            let sql = `UPDATE \`users\` SET \`name\`=${mysql.escape(name)}, \`surname\`=${mysql.escape(surname)}, \`email\`=${mysql.escape(email)}, \`edu_group\`=${mysql.escape(edu_group)}, \`birth\`=${mysql.escape(birth)}${!!password ? `, \`password\`=${mysql.escape((0, crypto_js_1.SHA512)(password).toString())}` : ""}${!!avatarURI ? `, \`avatarURI\`=${mysql.escape(avatar)}` : ""} WHERE \`id\`='${user.id}'`;
            pool.query(sql, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    //Обнуление чека почту при изменении
                    if (email != user.email) {
                        pool.query(`UPDATE \`users\` SET \`email_verified\`=0 WHERE \`id\`='${user.id}'`, function (err, resultUpdate) {
                            addVerifCode(email, user.id, req.get('origin')).then(() => {
                            });
                        });
                    }
                    //обновление токена при изменении пароля
                    if ((0, crypto_js_1.SHA512)(password).toString() != user.password) {
                        pool.query(`UPDATE \`users\` SET \`token\`='${uuidv4()}' WHERE \`id\`='${user.id}'`, function (err, resultUpdate) {
                            res.send(result);
                        });
                    }
                    res.send(result);
                }
            });
        }
    });
});
expressApp.post("/api/get_taken_initiatives/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            let sql = "";
            if (!!user && !!user.id) {
                sql = `SELECT * FROM \`initiatives_taken\` INNER JOIN \`initiatives\` on \`initiatives_taken\`.\`initiative_id\`=\`initiatives\`.\`id\` INNER JOIN \`initiative_conversations\` ON \`initiative_conversations\`.\`initiative_id\`=\`initiatives\`.\`id\` WHERE user_id='${user.id}'`;
            }
            pool.query(sql, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
});
expressApp.post("/api/get_completed_initiatives/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            let sql = `SELECT * FROM \`initiatives_completed\` INNER JOIN \`initiatives\` on \`initiatives_completed\`.\`initiative_id\`=\`initiatives\`.\`id\` WHERE user_id='${user.id}'`;
            pool.query(sql, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
});
expressApp.post("/api/get_initiatives/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let now = Date.now();
            pool.query(`SELECT * FROM \`initiatives\` WHERE deadline_take>${now} AND users_limit>users_taken union SELECT * from \`initiatives\` WHERE deadline_take>${now} AND users_limit IS NULL`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
});
expressApp.post("/api/start_initiative/", (req, res) => {
    const { token, initiative_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`email_verified\`=1 AND \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.id) {
                pool.query(`SELECT * FROM \`initiatives\` WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        let initiative = result[0];
                        if (initiative.users_limit == null || initiative.users_limit > initiative.users_taken) {
                            pool.query(`INSERT INTO \`initiatives_taken\` (\`identifer\`,\`initiative_id\`,\`user_id\`) VALUES (${mysql.escape(`${user.id}_${initiative_id}`)},${mysql.escape(initiative_id)},${mysql.escape(user.id)})`, function (err, result) {
                                if (err) {
                                    res.send(err.message);
                                }
                                else {
                                    pool.query(`UPDATE \`initiatives\` SET \`users_taken\`=\`users_taken\`+1 WHERE \`id\`='${initiative_id}'`, function (err, result) {
                                        if (err) {
                                            res.send(err.message);
                                        }
                                        else {
                                            res.send("Вы успешно приступили к выполнению задания!");
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            res.send("Достигнуто ограничение на кол-во мест!");
                        }
                    }
                });
            }
            else {
                res.send({ error: "email не подтверждён!" });
            }
        }
    });
});
expressApp.post("/api/complete_initiative/", (req, res) => {
    const { token, initiative_id, comment } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            pool.query(`INSERT INTO \`initiatives_completed\` (\`identifer\`,\`initiative_id\`,\`user_id\`,\`comment\`,\`checked\`) VALUES (${mysql.escape(`${user.id}_${initiative_id}`)},${mysql.escape(initiative_id)},${mysql.escape(user.id)},${mysql.escape(comment)},0)`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send();
                }
            });
        }
    });
});
expressApp.post("/api/get_initiatives_results/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT DISTINCT * FROM \`initiatives_completed\` JOIN \`initiatives\` on \`id\`=\`initiative_id\` WHERE \`checked\`=0 GROUP BY \`initiative_id\``, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post("/api/get_initiative_results/", (req, res) => {
    const { token, initiative_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT * FROM \`initiatives_completed\` JOIN \`initiatives\` on \`id\`=\`initiative_id\` JOIN \`users\` on \`user_id\`=\`users\`.\`id\` WHERE \`initiative_id\`='${initiative_id}' AND \`checked\`=0`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post("/api/add_initiative/", (req, res) => {
    const { token, title, income, take_deadline, complete_deadline, content, category, users_limit, isPrivate } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            let initiative_identifer = uuidv4();
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                let chatName = `${title} (${category}) (до ${new Date(complete_deadline).toLocaleString()})`;
                (0, axios_1.default)(`https://api.vk.com/method/messages.createChat?title=${encodeURIComponent(chatName)}&access_token=${vk_token}&v=5.131`).then(response => {
                    console.log(response.data);
                    let chatId = response.data.response;
                    (0, axios_1.default)(`https://api.vk.com/method/messages.getInviteLink?peer_id=${2000000000 + Number.parseInt(chatId)}&access_token=${vk_token}&v=5.131`).then(response => {
                        console.log(response.data);
                        let link = response.data.response.link;
                        pool.query(`INSERT INTO \`initiative_conversations\` (\`initiative_id\`, \`link\`) VALUES ('${initiative_identifer}', ${mysql.escape(link)})`, function (err, result) {
                            if (err) {
                                res.send(err.message);
                            }
                            else {
                                pool.query(`INSERT INTO \`initiatives\` (\`id\`, \`category\`, \`title\`, \`content\`, \`income\`, \`deadline_take\`, \`deadline_complete\`, \`users_limit\`, \`users_taken\`) VALUES ('${initiative_identifer}', ${mysql.escape(category)}, ${mysql.escape(title)}, ${mysql.escape(content)}, ${mysql.escape(income)}, ${mysql.escape(take_deadline)}, ${mysql.escape(complete_deadline)}, ${!!users_limit ? mysql.escape(users_limit) : "NULL"}, 0)`, function (err, result) {
                                    if (err) {
                                        res.send(err.message);
                                    }
                                    else {
                                        addAdminLog(user.id, `USER CREATED INITIATIVE {'params':${mysql.escape(JSON.stringify({ title, income, take_deadline, complete_deadline, content, category, users_limit, isPrivate }))}}`).then(() => {
                                            pool.query(`SELECT * FROM \`initiatives\` WHERE \`id\`='${initiative_identifer}'`, function (err, result) {
                                                if (err) {
                                                    res.send(err.message);
                                                }
                                                else {
                                                    res.send(result);
                                                    if (!isPrivate) {
                                                        tgBot.sendMessage("@mospedreserv", `
В *[акселераторе инициатив](https://initiative-accelerator-front-alexc-ux.vercel.app/cab/)* новое задание \\!

Название: *${tgBot_1.telegramBot.escapeMarkdown(title)}*
Категория:*${tgBot_1.telegramBot.escapeMarkdown(category)}*
Мест: *${!!users_limit ? users_limit : "Не ограничено"}*
Можно начать выполнять до: *${!!take_deadline ? new Date(take_deadline).toLocaleString() : "Не ограничено"}*
Нужно выполнить до: *${!!complete_deadline ? new Date(complete_deadline).toLocaleString() : "Не ограничено"}*
Награда: *${income} баллов*

*Описание:*
${tgBot_1.telegramBot.escapeMarkdown(content)}

Для того, чтобы принять участие в этом задании, перейдите в [личный кабинет](https://initiative-accelerator-front-alexc-ux.vercel.app/cab/#brick_${initiative_identifer})\\.

P\\.S\\.
Задание будет отображаться у всех пользователей до тех пор, пока к его выполнению возможно приступить\\.
`, "MarkdownV2", false, true);
                                                    }
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    });
                });
            }
            else {
                res.send("Wrong user role");
            }
        }
    });
});
expressApp.post("/api/update_initiative/", (req, res) => {
    const { token, initiative_id, title, income, take_deadline, complete_deadline, content, category, users_limit } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`UPDATE \`initiatives\`  SET  \`category\`=${mysql.escape(category)}, \`title\`=${mysql.escape(title)}, \`content\`=${mysql.escape(content)}, \`income\`=${mysql.escape(income)}, \`deadline_take\`=${mysql.escape(take_deadline)}, \`deadline_complete\`=${mysql.escape(complete_deadline)}, \`users_limit\`=${!!users_limit ? mysql.escape(users_limit) : "NULL"} WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send("Wrong user role");
            }
        }
    });
});
expressApp.post("/api/completely_delete_initiative/", (req, res) => {
    const { token, initiative_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && user.role == "Администратор") {
                addAdminLog(user.id, `USER DELETED INITIATIVE {'id':'${initiative_id}}'}`).then(() => {
                    pool.query(`DELETE FROM \`initiatives\` WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err, result) {
                        if (err) {
                            res.send(err.message);
                        }
                        else {
                            pool.query(`DELETE FROM \`initiatives_completed\` WHERE \`initiative_id\`=${mysql.escape(initiative_id)}`, function (err, result) {
                                if (err) {
                                    res.send(err.message);
                                }
                                else {
                                    pool.query(`DELETE FROM \`initiatives_taken\` WHERE \`initiative_id\`=${mysql.escape(initiative_id)}`, function (err, result) {
                                        if (err) {
                                            res.send(err.message);
                                        }
                                        else {
                                            pool.query(`UPDATE \`initiatives\` SET users_taken=users_taken-1 WHERE \`id\`=${mysql.escape(initiative_id)}`, function (err, result) {
                                                if (err) {
                                                    res.send(err.message);
                                                }
                                                else {
                                                    res.send(result);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }
            else {
                res.send("Wrong user role");
            }
        }
    });
});
expressApp.post("/api/get_all_initiatives/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT * FROM  \`initiatives\``, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send("Wrong user role");
            }
        }
    });
});
expressApp.post("/api/get_initiative_params/", (req, res) => {
    const { token, initiative_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT * FROM \`initiatives\` WHERE \`id\`='${initiative_id}'`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send("Wrong user role");
            }
        }
    });
});
expressApp.post("/api/get_initiative_members/", (req, res) => {
    const { token, initiative_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            let taken = [];
            let completed = [];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT * FROM initiatives_taken INNER JOIN initiatives on initiatives_taken.initiative_id=initiatives.id INNER JOIN users ON users.id=initiatives_taken.user_id WHERE initiatives_taken.initiative_id=${mysql.escape(initiative_id)}`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        taken = result;
                        pool.query(`SELECT * FROM initiatives_completed INNER JOIN initiatives on initiatives_completed.initiative_id=initiatives.id INNER JOIN users ON users.id=initiatives_completed.user_id WHERE initiatives_completed.initiative_id=${mysql.escape(initiative_id)}`, function (err, result) {
                            if (err) {
                                res.send(err.message);
                            }
                            else {
                                function removeEmpty(array) {
                                    let result = array.filter(element => {
                                        return element !== null;
                                    });
                                    return result;
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
                                res.send([...completed, ...taken]);
                            }
                        });
                    }
                });
            }
            else {
                res.send("Wrong user role");
            }
        }
    });
});
expressApp.post("/api/get_all_shop_items/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT * FROM \`shop_items\``, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send("Wrong user role");
            }
        }
    });
});
expressApp.post("/api/get_shop_item_params/", (req, res) => {
    const { token, item_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`SELECT * FROM \`shop_items\` WHERE \`id\`='${item_id}'`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send("Wrong user role");
            }
        }
    });
});
expressApp.post("/api/get_personal_rating/", (req, res) => {
    const { token } = req.body;
    pool.query(`SET @rank=0;SET @userScore = (SELECT \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}); SELECT \`position\`,\`score\` FROM ( SELECT @rank:=@rank+1 AS \`position\`, \`token\`, \`score\` FROM ( SELECT \`score\`, \`token\` FROM \`users\` ORDER BY \`score\` DESC ) as t1 ) as t2  WHERE \`score\` = @userScore ORDER BY \`position\` ASC LIMIT 1;`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            res.send(result[2][0]);
        }
    });
});
expressApp.post("/api/add_shop_item/", (req, res) => {
    const { token, cost, title, description, deadline_take, users_limit, user_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`INSERT INTO \`shop_items\` (\`id\`, \`cost\`, \`title\`, \`description\`, \`deadline_take\`, \`users_limit\`, \`users_taken\`, \`user_id\`) VALUES (NULL, ${mysql.escape(cost)}, ${mysql.escape(title)}, ${mysql.escape(description)}, ${!!deadline_take ? mysql.escape(deadline_take) : "NULL"}, ${!!users_limit ? mysql.escape(users_limit) : "NULL"}, '0', ${!!user_id ? mysql.escape(user_id) : "NULL"});`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post("/api/update_shop_item/", (req, res) => {
    const { token, cost, title, description, deadline_take, users_limit, item_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор" || user.role == "Модератор")) {
                pool.query(`UPDATE \`shop_items\` SET \`cost\`=${mysql.escape(cost)}, \`title\`=${mysql.escape(title)}, \`description\`=${mysql.escape(description)}, \`deadline_take\`=${!!deadline_take ? mysql.escape(deadline_take) : "NULL"}, \`users_limit\`=${!!users_limit ? mysql.escape(users_limit) : "NULL"} WHERE \`id\`=${mysql.escape(item_id)};`, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        res.send(result);
                    }
                });
            }
            else {
                res.send();
            }
        }
    });
});
expressApp.post("/api/get_shop_items/", (req, res) => {
    const { token } = req.body;
    let now = Date.now();
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            pool.query(`SELECT * FROM \`shop_items\` WHERE \`deadline_take\` IS NULL AND \`users_limit\`>\`users_taken\` AND \`user_id\` is NULL UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\`>${now} AND \`users_limit\` IS NULL AND \`user_id\` is NULL UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\` IS NULL AND \`users_limit\` IS NULL AND \`user_id\` is NULL UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\`>${now} AND \`users_limit\`>\`users_taken\` AND \`user_id\` is NULL UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\` IS NULL AND \`users_limit\`>\`users_taken\` AND \`user_id\`=${mysql.escape(user.id)} UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\`>${now} AND \`users_limit\` IS NULL AND \`user_id\`=${mysql.escape(user.id)} UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\` IS NULL AND \`users_limit\` IS NULL AND \`user_id\`=${mysql.escape(user.id)} UNION SELECT * FROM \`shop_items\` WHERE \`deadline_take\`>${now} AND \`users_limit\`>\`users_taken\` AND \`user_id\`=${mysql.escape(user.id)}`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
});
expressApp.post("/api/buy_shop_item/", (req, res) => {
    const { token, shop_item_id } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            pool.query(`SELECT * FROM \`shop_items\` WHERE \`id\`=${mysql.escape(shop_item_id)}`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    let shopItem = result[0];
                    let now = Date.now();
                    if (user.score - shopItem.cost >= 0) {
                        if (shopItem.users_limit == null || shopItem.users_taken < shopItem.users_limit) {
                            pool.query(`INSERT INTO \`shop_logs\` (\`identifer\`, \`shop_item_id\`,\`user_id\`,\`time\`) VALUES (NULL, ${mysql.escape(shop_item_id)}, '${user.id}', ${now})`, function (err, result) {
                                if (err) {
                                    res.send(err.message);
                                }
                                else {
                                    pool.query(`UPDATE \`users\` SET \`score\`=\`score\`-${shopItem.cost} WHERE \`id\`='${user.id}'`, function (err, result) {
                                        if (err) {
                                            res.send(err.message);
                                        }
                                        else {
                                            pool.query(`UPDATE \`shop_items\` SET \`users_taken\`=\`users_taken\`+1 WHERE \`id\`='${mysql.escape(shop_item_id)}'`, function (err, result) {
                                                if (err) {
                                                    res.send(err.message);
                                                }
                                                else {
                                                    res.send("Обмен баллов прошел успешно!");
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            res.send("Достигнуто ограничение по количеству!");
                        }
                    }
                    else {
                        res.send("У Вас недостаточно баллов!");
                    }
                }
            });
        }
    });
});
expressApp.post("/api/get_my_shop_logs/", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            pool.query(`SELECT * FROM \`shop_logs\` JOIN \`shop_items\` ON \`shop_items\`.\`id\`=\`shop_logs\`.\`shop_item_id\` WHERE  \`shop_logs\`.\`user_id\`='${user.id}' ORDER BY \`shop_logs\`.\`time\` DESC`, function (err, result) {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
});
server.listen(process.env.PORT || 3000, () => {
    console.log(`listening on *:${process.env.PORT || 3000}`);
});
function addAdminLog(userId, message) {
    return new Promise(function (resolve, reject) {
        pool.query(`INSERT INTO admin_logs (\`id\`, \`time\`,\`user\`,\`message\`) VALUES ('${uuidv4()}','${Date.now()}', ${mysql.escape(userId)}, ${mysql.escape(message)})`, function (err, result) {
            if (err) {
                reject(err);
            }
            else {
                resolve(true);
            }
        });
    });
}
expressApp.post("/api/getBigInitiativesStatistics", (req, res) => {
    const { token } = req.body;
    pool.query(`SELECT \`name\`,\`surname\`, \`login\`, \`id\`, \`token\`, \`birth\`, \`role\`, \`score\` FROM \`users\` WHERE \`token\`=${mysql.escape(token)}`, function (err, result) {
        if (err) {
            res.send(err.message);
        }
        else {
            let user = result[0];
            if (!!user && !!user.role && (user.role == "Администратор")) {
                const sqlRequest = "SELECT * FROM (SELECT id as i_id,category,title, deadline_complete, users_limit, users_taken FROM `initiatives`) as initiatives_tbl INNER JOIN `initiatives_completed` on `initiatives_tbl`.`i_id`=`initiatives_completed`.`initiative_id` INNER JOIN (SELECT id as u_id, name, surname, email, score FROM `users`) as users_tbl ON `initiatives_completed`.`user_id`=`users_tbl`.`u_id`;";
                pool.query(sqlRequest, function (err, result) {
                    if (err) {
                        res.send(err.message);
                    }
                    else {
                        let resultObj = result;
                        let rows = "Идентификатор задания;Категория задания;Заголовок задания;Срок сдачи задания;Ограничение по количеству пользователей;Количество пользователей, выполнивших задание;Идентификатор пользователя;Имя пользователя;Фамилия пользователя;Почта пользователя;Баллы пользователя\n";
                        resultObj.forEach((resp) => {
                            rows = `${rows}${resp.i_id};${resp.category};${resp.title};${new Date(resp.deadline_complete).toLocaleDateString()};${resp.users_limit};${resp.users_taken};${resp.user_id};${resp.name};${resp.surname};${resp.email};${resp.score}\n`;
                        });
                        res.header("Content-Type", "text/csv");
                        res.send(rows);
                    }
                });
            }
        }
    });
});
function addVerifCode(email, user_id, origin) {
    const code = uuidv4();
    let id = uuidv4();
    return new Promise(function (resolve, reject) {
        pool.query(`INSERT INTO \`account_verif_codes\` (\`id\`,\`mail\`,\`code\`,\`user_id\`,\`activated\`) VALUES (${mysql.escape(id)},${mysql.escape(email)},${mysql.escape(code)}, ${mysql.escape(user_id)}, 0)`, function (err, result) {
            if (err) {
                reject(err);
            }
            else {
                Mailer_1.SendServiceEmail.sendText({ recipient: email, subject: "Подтверждение регистрации | Акселератор инициатив", text: `Для подтверждения адреса электронной почты перейдите по ссылке: ${origin}/mail/verif/${id}/${code}` })
                    .then(() => {
                    resolve(code);
                });
            }
        });
    });
}
