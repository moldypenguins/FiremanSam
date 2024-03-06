"use strict";
/**
 * FiremanSam
 * Copyright (c) 2023 The Dumpster Fire - Craig Roberts
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see https://www.gnu.org/licenses/gpl-3.0.html
 *
 * @name FiremanSam.js
 * @version 2023-07-04
 * @summary The Dumpster Fire
 **/



import util from "util";

import Config from "./config.js";
import { DB, Faction, FactionMember, OrganizedCrime, Application } from "./db.js";

import { TornAPI } from "ts-torn-api";

import { Context, Telegraf } from "telegraf";

import { ActivityType, Client, Collection, Events, GatewayIntentBits, Routes, REST, Guild, roleMention } from "discord.js";
import BotCommands from "./BotCommands/BotCommands.js";
import BotEvents from "./BotEvents/BotEvents.js";

import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
let Scheduler = new ToadScheduler();

import minimist from "minimist";
let argv = minimist(process.argv.slice(2), {
  string: [],
  boolean: ["register"],
  alias: { r: "register" },
  default: { "register": false },
  unknown: false
});

//register bot commands
if(argv.register) {
  const rest = new REST().setToken(Config.discord.token);
  (async () => {
    try {
      const botCommands = [];
      for (let [key, value] of Object.entries(BotCommands)) {
        botCommands.push(value.data.toJSON());
      }
      const data = await rest.put(Routes.applicationCommands(Config.discord.client_id), {body: botCommands});
      console.log(`Reloaded ${data.length} discord commands.`);
    } catch (err) {
      console.error(err);
    }
  })();
}


//connect to database
DB.connection.once("open", async () => {

  const telegramBot = new Telegraf(Config.telegram.token, { telegram: { agent: null, webhookReply: false }, username: Config.telegram.username });

  telegramBot.use(async(ctx, next) => {
    //console.log("CTX: ", util.inspect(ctx.message, true, null, true));
    //check for unknown groups
    if(ctx.message?.chat?.id && !ctx.message?.from?.is_bot && ctx.message.chat.type !== "private") {
      //console.log(ctx.message);
      discordBot.channels.cache.get(Config.discord.telegram_id).send(`${ctx.message.from.username}: ${ctx.message.text}`);
    }
  });

  /*
  telegramBot.context.mentions = {
    get: async (message) => {
      let mentions = [];
      if(message.entities !== undefined) {
        let eMentions = message.entities.filter(e => e.type === "mention");
        for (let i = 0; i < eMentions.length; i++) {
          //console.log(`EMENT: ${util.inspect(eMentions[i], true, null, true)}`);
          let usrnm = message.text.slice(eMentions[i].offset, eMentions[i].offset + eMentions[i].length);
          //console.log('usrnm: ' + util.inspect(usrnm, false, null, true));
          mentions.push(eMentions[i]);
        }
        let etMentions = message.entities.filter(e => e.type === "text_mention");
        for (let i = 0; i < etMentions.length; i++) {
          mentions.push(etMentions[i]);
        }
      }
      return mentions;
    }
  };
  */

  telegramBot.catch(async(err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
  });









  const discordBot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent
    ]
  });

  //*************************************************************************************************************
  // HourJob/HourTask
  //*************************************************************************************************************
  let hour_task = new AsyncTask("HourTask", async() => {
  //console.log("HourJob running HourTask");
    let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);

    //console.log("FACTION JOB RUNNING");
    /*
    for(let f = 0; f < Config.torn.faction.length; f++) {
      Faction.api_update(Config.torn.faction[f]);
    }
    for(let a = 0; a < Config.torn.allied.length; a++) {
      Faction.api_update(Config.torn.allied[a]);
    }
    */
    //faction organized crimes
    /*
    const ocs = (await torn.faction.crimes()).filter(oc => oc.initiated == 0 && oc.time_left == 0);
    if(ocs.length > 0) {
      for(let oc = 0; oc < ocs.length; oc++) {
        if(!await OrganizedCrime.exists({oc_id: ocs[oc].id})) {
        //console.log(`OC: ${util.inspect(ocs[oc], true, null, true)}`);
          let crime = new OrganizedCrime({
            _id: new DB.Types.ObjectId(),
            oc_id: ocs[oc].id,
            oc_initiated: ocs[oc].initiated == 1
          });
          await crime.save();

          let ppants = [];
          for(let p = 0; p < ocs[oc].participants.length; p++) {
          //console.log(`MEM: ${util.inspect(fac.members, true, null, true)}`);
            let mem = await FactionMember.findOne({factionmember_id: ocs[oc].participants[p].id});
            if(mem != null) {
              let ppant = `:${ocs[oc].participants[p].color}_circle: **${mem.factionmember_name} [${mem.factionmember_id}]** - ${ocs[oc].participants[p].state}`;
              if(ocs[oc].participants[p].state != "Okay") { ppant += ` (${ocs[oc].participants[p].description})`; }
              //console.log(`MEM: ${ppant}`);
              ppants.push(ppant); 
            } else {
              console.error(`Cannot find member: ${ocs[oc].participants[p].id}`);
            }
          }
          
          let embed = {
            color: 0xFF0000,
            title: `${ocs[oc].crime_name}`,
            url: "https://www.torn.com/factions.php?step=your#/tab=crimes",
            fields: [
              { name: "Participants", value: ppants.join("\n"), inline: true }
            ],
            timestamp: new Date().toISOString(),
          };
          client.channels.cache.get(Config.torn.oc.channel_id).send({ content: `${roleMention(Config.torn.oc.role_id)} ORGANIZED CRIME READY`, embeds: [embed] });
        }
      }

    }
    */



    
    return;
  });


  //*************************************************************************************************************
  // MinuteJob/MinuteTask
  //*************************************************************************************************************
  let minute_task = new AsyncTask("MinuteTask", async() => {
  //console.log("MinuteJob running MinuteTask");
    let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);

    //faction applications
    /*
    const apps = (await torn.faction.applications()).filter(app => app.status == "active");
    if(apps.length > 0) {
    //console.log(`APPS: ${util.inspect(apps, true, null, true)}`);
      for(let app = 0; app < apps.length; app++) {
        let uApp;
        if(!await Application.exists({application_userid: apps[app].userID})) {
          uApp = new Application({
            _id: new DB.Types.ObjectId(),
            application_userid: apps[app].userID,
            application_name: apps[app].name,
            application_level: apps[app].level,
            application_message: apps[app].message,
            application_expires: new Date(apps[app].expires * 1000),
            application_status: apps[app],
            application_messageid: apps[app]
          });
          await uApp.save();
        }
        else
        {
          uApp = await Application.findOne({application_userid: apps[app].userID});
        }

        if(uApp != null)
        {
          console.log(`APP: ${util.inspect(uApp, true, null, true)}`);
          
          if(!uApp.messageid) {
            let embed = {
              color: 0xFF0000,
              title: `${ocs[oc].crime_name}`,
              url: "https://www.torn.com/factions.php?step=your#/tab=crimes",
              fields: [
                { name: "Participants", value: ppants.join("\n"), inline: true }
              ],
              timestamp: new Date().toISOString(),
            };
            let mess = client.channels.cache.get(Config.torn.oc.channel_id).send({ content: `${roleMention(Config.torn.oc.role_id)} ORGANIZED CRIME READY`, embeds: [embed] });
            console.log(`MESS: ${util.inspect(mess, true, null, true)}`);
          //uApp.messageid = mess.id;
          }
          
        }
        

      }
      
    }
    */



    return;
  });


  //*************************************************************************************************************
  // DBJob/DBTask
  //*************************************************************************************************************
  let db_task = new AsyncTask("DBTask", async() => {
  //console.log("DBJob running DBTask");




    return;
  });
  





  let dsCommands = new Collection();
  for(let [name, command] of Object.entries(BotCommands)) {
    if(BotCommands[name]) {
      if("data" in command && "execute" in command) {
        dsCommands.set(command.data.name, command);
      }
      else {
        console.log(`[WARNING] The command ${name} is missing a required "data" or "execute" property.`);
      }
    }
    else {
      console.log(`[WARNING] The command ${name} was not found.`);
    }
  }
  discordBot.commands = dsCommands;


  //handle discord events
  for (const ev in BotEvents) {
    //console.error(`HERE: ${util.inspect(BotEvents[ev], true, null, true)}`);
    if (BotEvents[ev].once) {
      discordBot.once(BotEvents[ev].name, (...args) => BotEvents[ev].execute(discordBot, ...args));
    } else {
      discordBot.on(BotEvents[ev].name, (...args) => BotEvents[ev].execute(discordBot, ...args));
    }
  }


  discordBot.on("messageCreate", async (msg) => {
    if(msg.channelId === Config.discord.telegram_id && !msg.author.bot) {
      //console.log("text: ", util.inspect(msg.cleanContent, true, null, true));
      await telegramBot.telegram.sendMessage(Config.telegram.group_id, `${msg.author.username}: ${msg.cleanContent}`, {parse_mode: "HTML"});
    }
  });

  discordBot.on(Events.InteractionCreate, async (interaction) => {
    if(
      !interaction.isChatInputCommand() && 
      !interaction.isButton() && 
      !interaction.isStringSelectMenu() && 
      !interaction.isChannelSelectMenu() && 
      !interaction.isRoleSelectMenu() && 
      !interaction.isModalSubmit()
    ) { return; }

    //console.log(interaction);

    const command = interaction.isChatInputCommand() ? interaction.client.commands.get(interaction.commandName) : interaction.client.commands.get(interaction.customId.split("_")[0]);

    if(!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
    }
    else {
      try {
        await command.execute(discordBot, interaction);
      }
      catch(err) {
        console.error(err);
        await interaction.reply({content: "There was an error while executing this command!", ephemeral: true});
      }
    }

  });

  discordBot.on(Events.ClientReady, async() => {
    console.log(`Discord: Logged in as ${discordBot.user.username}!`);
    discordBot.user.setActivity("your mother undress", { type: ActivityType.Watching });
    //discordBot.channels.cache.get(Config.discord.channel_id).send(`${discordBot.user.username} reporting for duty!`);
    /*
    Scheduler.addSimpleIntervalJob(new SimpleIntervalJob(
      { hours: Config.torn.timers.hour, runImmediately: true },
      hour_task,
      { id: "HourJob" }
    ));
    Scheduler.addSimpleIntervalJob(new SimpleIntervalJob(
      { minutes: Config.torn.timers.minute, runImmediately: true },
      minute_task,
      { id: "MinuteJob", preventOverrun: true }
    ));
    Scheduler.addSimpleIntervalJob(new SimpleIntervalJob(
      { minutes: Config.torn.timers.database, runImmediately: true },
      db_task,
      { id: "DBJob", preventOverrun: true }
    ));
    */
  });

  // *******************************************************************************************************************
  // Run bot
  // *******************************************************************************************************************
  console.log("Starting...");
  telegramBot.launch().then((r) => { console.log(`Telegram: Logged in as ${telegramBot.botInfo.username}!`); });
  await discordBot.login(Config.discord.token);

});
