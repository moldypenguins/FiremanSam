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



import Config from "./config.js";
import { DB, Faction, FactionMember, OrganizedCrime, Application } from "./db.js";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import minimist from "minimist";
import util from "util";

import { TornAPI } from "ts-torn-api";

import BotCommands from "./BotCommands/BotCommands.js";
import BotEvents from "./BotEvents/BotEvents.js";

let argv = minimist(process.argv.slice(2), {
  string: [],
  boolean: ["register"],
  alias: { r: "register" },
  default: { "register": false },
  unknown: false
});


import { ActivityType, Client, Collection, Events, GatewayIntentBits, Routes, REST, Guild, roleMention } from "discord.js";



//register discord commands
if(argv.register) {
  const rest = new REST().setToken(Config.discord.token);
  (async () => {
    try {
      const dsCommands = [];
      Config.discord.commands.forEach(function(name) {
        if(BotCommands[name]) {
          dsCommands.push(BotCommands[name].data.toJSON());
        }
      });
      const data = await rest.put(Routes.applicationCommands(Config.discord.client_id), {body: dsCommands});
      console.log(`Reloaded ${data.length} discord commands.`);
    } catch (err) {
      console.error(err);
    }
  })();
}

// connect to database
DB.connection.once("open", async () => {

  const client = new FiremanSamClient({
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
    ],
    torn_api_key: Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]
  });






  //*************************************************************************************************************
  // HourJob/HourTask
  //*************************************************************************************************************
  //TODO: rename HourJob/HourTask
  let hour_task = new AsyncTask("HourTask", async() => {
    //console.log("HourJob running HourTask");
    let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);

    //console.log("FACTION JOB RUNNING");
    UpdateFaction(Config.torn.faction);
    for(let a = 0; a < Config.torn.allied.length; a++) {
      UpdateFaction(Config.torn.allied[a]);
    }

    //console.log("API JOB RUNNING");
    //let fac = await Faction.findOne({faction_id: Config.torn.faction});
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

    return;
  });

  

  //*************************************************************************************************************
  // MinuteJob/MinuteTask
  //*************************************************************************************************************
  let minute_task = new AsyncTask("MinuteTask", async() => {
    //console.log("MinuteJob running MinuteTask");
    let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);

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

    return;
  });



  //*************************************************************************************************************
  // DBJob/DBTask
  //*************************************************************************************************************
  let db_task = new AsyncTask("DBTask", async() => {
    //console.log("DBJob running DBTask");




    return;
  });






  const hour_job = new SimpleIntervalJob(
    { hours: Config.torn.timers.hour, runImmediately: true },
    hour_task,
    { id: "HourJob" }
  );
  const minute_job = new SimpleIntervalJob(
    { minutes: Config.torn.timers.minute, runImmediately: true },
    minute_task,
    { id: "MinuteJob", preventOverrun: true }
  );
  const db_job = new SimpleIntervalJob(
    { minutes: Config.torn.timers.database, runImmediately: true },
    db_task,
    { id: "DBJob", preventOverrun: true }
  );
  





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
  client.commands = dsCommands;


  //console.error(`EVENTS: ${util.inspect(Object.keys(BotEvents).length, true, null, true)}`);
  for (const ev in BotEvents) {
    //console.error(`HERE: ${util.inspect(BotEvents[ev], true, null, true)}`);
    if (BotEvents[ev].once) {
      client.once(BotEvents[ev].name, (...args) => BotEvents[ev].execute(client, ...args));
    } else {
      client.on(BotEvents[ev].name, (...args) => BotEvents[ev].execute(client, ...args));
    }
  }







  client.on("messageCreate", (msg) => {
    if(msg.channelId === Config.discord.channel_id && !msg.author.bot) {
      console.log("text: ", util.inspect(msg.cleanContent, true, null, true));
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if(!interaction.isChatInputCommand() && !interaction.isButton()) { return; }

    //console.log(interaction);

    const command = interaction.isChatInputCommand() ? interaction.client.commands.get(interaction.commandName) : interaction.client.commands.get(interaction.customId.split("_")[0]);

    if(!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
    }
    else {
      try {
        await command.execute(client, interaction);
      }
      catch(err) {
        console.error(err);
        await interaction.reply({content: "There was an error while executing this command!", ephemeral: true});
      }
    }

  });

  client.on(Events.ClientReady, async() => {
    console.log(`Discord: Logged in as ${client.user.username}!`);
    client.user.setActivity("your mother undress", { type: ActivityType.Watching });
    //client.channels.cache.get(Config.discord.channel_id).send(`${client.user.username} reporting for duty!`);
    client.Scheduler.addSimpleIntervalJob(hour_job);
    client.Scheduler.addSimpleIntervalJob(minute_job);
    client.Scheduler.addSimpleIntervalJob(db_job);
  });

  // *******************************************************************************************************************
  // Run bot
  // *******************************************************************************************************************
  console.log("Starting...");
  await client.login(Config.discord.token);

});


class FiremanSamClient extends Client
{
  /**
	 * Options for a FiremanSamClient
	 * @typedef {ClientOptions} FiremanSamClientOptions
	 * @property {string} [torn_api_key]
	 */

  /**
	 * @param {FiremanSamClientOptions} [options] - Options for the client
	 */
  constructor(options = {}) {
    if(typeof options.torn_api_key === "undefined") { throw new Error("Error"); }
    super(options);

    /**
		 * The client's torn api
		 * @type {TornAPI}
		 */
    this.Torn = new TornAPI(this.options.torn_api_key);

    this.Scheduler = new ToadScheduler();
  }

  


}


const UpdateFaction = async(faction_id) => {
  let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);
  let faction = await torn.faction.faction(faction_id);
  //console.log(`FAC: ${util.inspect(faction, true, null, true)}`);
  if(faction != null) {
    let fac;
    if(!(await Faction.exists({faction_id: faction.ID}))) {
      fac = new Faction({
        _id: new DB.Types.ObjectId(),
        faction_id: faction.ID,
        faction_name: faction.name,
        faction_tag: faction.tag,
        faction_tag_image: faction.tag_image,
        faction_respect: faction.respect,
        faction_age: faction.age,
        faction_capacity: faction.capacity,
        faction_best_chain: faction.best_chain
      });
      await fac.save();
    } else {
      fac = await Faction.findOne({faction_id: faction.ID});
    }
    //update faction members
    for(let m = 0; m < faction.members.length; m++) {
      if(!(await FactionMember.exists({factionmember_id: faction.members[m].id}))) {
        let facmem = new FactionMember({
          _id: new DB.Types.ObjectId(),
          factionmember_id: faction.members[m].id,
          factionmember_name: faction.members[m].name,

          factionmember_level: faction.members[m].level,
          factionmember_days_in_faction: faction.members[m].days_in_faction,
          factionmember_position: faction.members[m].position,
          factionmember_faction: fac
        });
        await facmem.save();
      }
    }
  }
};
