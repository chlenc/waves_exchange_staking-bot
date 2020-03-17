import * as TelegramBot from 'node-telegram-bot-api';
import {
    addParticipant,
    checkBoughtUSDN,
    checkStakeUSDN, getUser,
    getUserLang,
    isValidAddress,
    phrase,
    updateUser
} from './assets/helpers';
import { langKey, startKey } from './assets/keyboards';

const cache = require('memory-cache');
require('dotenv').config();

const bot = new TelegramBot(process.env.TOKEN, {polling: true});

bot.onText(/\/start/, ({chat: {id}}) => {
    bot.sendMessage(id, phrase('en', 'alreadyParticipating'), langKey);
});

bot.on('message', async (msg) => {
    if (cache.get('status') === 'wait_address' && !msg.text.includes('/')) {
        const lang = await getUserLang(msg.from.id);
        await bot.sendMessage(msg.from.id, phrase(lang, 'wait'));

        const user = await getUser(msg.from.id);
        if(user && user.address && user.date){
            await bot.sendMessage(msg.from.id, phrase(lang, 'alreadyParticipating'));
            cache.del('status');
            return;
        }

        if (!isValidAddress(msg.text)) {
            await bot.sendMessage(msg.from.id,  phrase(lang, 'invalidAddress'));
            await bot.sendMessage(msg.from.id, phrase(lang, 'address'));
            return;
        }

        const isBoughtUSDN = await checkBoughtUSDN(msg.text);
        if (!isBoughtUSDN) {
            await bot.sendMessage(msg.from.id,  phrase(lang, 'notEnoughMoney'));
            await bot.sendMessage(msg.from.id, phrase(lang, 'address'));
            return;
        }
        const isStakeUSDN = await checkStakeUSDN(msg.text);
        if (!isStakeUSDN) {
            await bot.sendMessage(msg.from.id,  phrase(lang, 'stakeRequired'));
            await bot.sendMessage(msg.from.id, phrase(lang, 'address'));
            return;
        }
        await addParticipant(msg.text, {...msg.from, address: msg.text, date: (new Date()).getTime()});
        await bot.sendMessage(msg.from.id, phrase(lang, 'congratulations'));
        cache.del('status');

    }
});

bot.on('callback_query', async (q) => {
    try{
        const {type, data} = JSON.parse(q.data)
        if(type === 'lang'){
            await updateUser(q.from.id, {...q.from, 'lang': data});
            await bot.sendMessage(q.from.id, phrase(data, 'start'), startKey(data));
        } else if(type === 'start'){
            const lang = await getUserLang(q.from.id);
            await bot.sendMessage(q.from.id, phrase(lang, 'address'));
            cache.put('status', 'wait_address');
        }
    }catch (e) {

    }

});


process.stdout.write('Bot has been started ✅ ');