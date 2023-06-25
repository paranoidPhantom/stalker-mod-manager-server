require('dotenv').config()
const fs = require("fs")
const colors = require("colors")
const { Telegraf, Telegram, Format, Input, Markup } = require('telegraf');
const { Keyboard } = require('telegram-keyboard')
const bot = new Telegraf(process.env.BOT_TOKEN);
const JSON_DB = require('simple-json-db');
const CONFIG = require("./config.json")
const sessionsDB = new JSON_DB('db/sessionsDB.json');
var registeredCommands = []
var dynamicQueryListeners = []

const regCmd = (command, description, callbackfn, disableRegistration) => {
    try {
        if (command == "/start") {
            bot.start(callbackfn);
        } else if (command == "/help") {
            bot.help(callbackfn)
        } else if (command.startsWith("/")) {
            bot.command(command.replace("/",""), callbackfn)
        } else {
            bot.hears(command,callbackfn)
        }
        if (disableRegistration !== true && command.startsWith("/")) {
            registeredCommands[registeredCommands.length] = {command: command.replace("/",""), description: description}
        }
    } catch(err) {
        console.log(("Error registering '"+command+"' |",err).red)
    }
}

const regAction = (action_id, callbackfn) => {
    try {
        bot.action(action_id,callbackfn)
    } catch(err) {
        console.log(("Error registering action '"+action_id+"' |",err).red)
    }
}

//________Command registration__________
const Buttons = Markup.inlineKeyboard
const BTN = Markup.button.callback

const generateCode = async (ctx) => {
    const user = ctx.from
    let code = ""
    while (sessionsDB.has("_login_code_"+code) || code == "") {
        code = ""
        const length = 6
        const characters = '0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
          code += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
    }
    const db =  sessionsDB.JSON()
    const keys = Object.keys(db)
    keys.forEach((key) => {
        const checkingUser = db[key]
        if (checkingUser.id === user.id) {
            sessionsDB.delete(key)
        }
    })
    sessionsDB.set("_login_code_"+code, user)
    //
    setTimeout(async () => {
        await ctx.replyWithMarkdown("```"+code+"```")
    }, 1000);
}

// Start command

regCmd("/start","🤝 Начало взаимодействия", async (ctx) => {
    try {
        await ctx.replyWithHTML("<b>Привет!</b>\n<i>Введи команду /login или нажми кнопку чтобы получить код!</i>",Buttons(
            [
                [BTN("🚀","get_code")]
            ]
        ))
    } catch(err) {
        await ctx.replyWithMarkdown("**Ошибка выполнения комманды:** \n`\n"+err+"\n`")
        console.log(("Error running '/start' |",err))
    }
})

regCmd("/login", "Получить код для входа на сайт", generateCode)

regCmd("/setperms", "admin only", (ctx) => {
    const usersDB = new JSON_DB('db/usersDB.json');
    const text = ctx.message.text
    const args = text.split(" ")
    const UID = ctx.message.from.id
    const subjectUID = args[1]
    const accessLevel = args[2]
    if (!accessLevel || (accessLevel < 0 || accessLevel > 2)) { ctx.reply("Уровень доступа должен быть между 0 и 2"); return }
    const user_data = usersDB.get(UID)
    const subject_data = usersDB.get(subjectUID) || {}
    try {
        if (!CONFIG.adminIDs.includes(UID)) { if (user_data.accessLevel <= subject_data.accessLevel) { ctx.reply("Не хватает прав"); return } }
        subject_data.accessLevel = accessLevel
        usersDB.set(subjectUID, subject_data)
    } catch (error) {
        ctx.reply(`Error: ${error}`)
    }
}, true)

regAction("get_code", generateCode)

//______________________________________
try {
    bot.on("callback_query",(ctx) => {
        const data = ctx.callbackQuery.data
        dynamicQueryListeners.forEach(listener => {
            if (data.startsWith(listener.prefix)) {
                const input = data.replace(listener.prefix,"").split("_")
                listener.callbackfn.call(this,ctx,input)
            }
        })
    })
    bot.telegram.setMyCommands(registeredCommands)
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    bot.launch();
} catch(err) {
    console.log("ERROR STARTING BOT:".red,err.bgRed)
}