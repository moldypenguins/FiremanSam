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
import { DB, Guild, User } from "./db.js";

import { Context, Telegraf } from "telegraf";

import {
  ActivityType,
  AttachmentBuilder,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Routes,
  REST,
  roleMention,
  blockQuote,
  bold,
  italic,
  quote,
} from "discord.js";
import BotCommands from "./BotCommands/BotCommands.js";
import BotEvents from "./BotEvents/BotEvents.js";

//import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
//let Scheduler = new ToadScheduler();

import minimist from "minimist";
let argv = minimist(process.argv.slice(2), {
  string: [],
  boolean: ["register"],
  alias: { r: "register" },
  default: { register: false },
  unknown: false,
});

//register bot commands
if (argv.register) {
  const rest = new REST().setToken(Config.discord.token);
  (async () => {
    try {
      const botCommands = [];
      for (let [key, value] of Object.entries(BotCommands)) {
        botCommands.push(value.data.toJSON());
      }
      const data = await rest.put(
        Routes.applicationCommands(Config.discord.client_id),
        { body: botCommands }
      );
      console.log(`Reloaded ${data.length} discord commands.`);
    } catch (err) {
      console.error(err);
    }
  })();
}

//##################################################################################################

function getTelegramName(user) {
  let name = null;
  if (user.username) {
    name = user.username;
  } else {
    name = `${user.first_name}` + (user.last_name ? ` ${user.last_name}` : "");
  }
  return name;
}

function isImage(attachment, index, array) {
  return attachment.contentType.startsWith("image");
}

//##################################################################################################

//connect to database
DB.connection.once("open", async () => {
  const telegramBot = new Telegraf(Config.telegram.token, {
    telegram: { agent: null, webhookReply: false },
    username: Config.telegram.username,
  });

  telegramBot.use(async (ctx, next) => {
    //console.log("MSG: ", util.inspect(ctx.message, true, null, true));
    //check for unknown groups
    if (
      ctx.message?.chat?.id == Config.telegram.group_id &&
      !ctx.message?.from?.is_bot &&
      ctx.message?.chat?.type !== "private"
    ) {
      //console.log("OTHER: ", util.inspect(ctx.message.animation, true, null, true));
      if (ctx.message?.photo?.length > 0) {
        let picLink = await telegramBot.telegram.getFileLink(
          ctx.message.photo.pop().file_id
        );
        discordBot.channels.cache?.get(Config.discord.telegram_id)?.send({
          files: [new AttachmentBuilder(picLink.href)],
          content:
            `${bold(italic(getTelegramName(ctx.message.from)))}` +
            (ctx.message.text?.length > 0 ? `: ${ctx.message.text}` : ""),
        });
      } else if (ctx.message?.animation) {
        let picLink = await telegramBot.telegram.getFileLink(
          ctx.message.animation.file_id
        );
        discordBot.channels.cache?.get(Config.discord.telegram_id)?.send({
          files: [new AttachmentBuilder(picLink.href)],
          content:
            `${bold(italic(getTelegramName(ctx.message.from)))}` +
            (ctx.message.text?.length > 0 ? `: ${ctx.message.text}` : ""),
        });
      } else if (
        ctx.message?.document?.mime_type?.toLowerCase().startsWith("image")
      ) {
        let picLink = await telegramBot.telegram.getFileLink(
          ctx.message.document.file_id
        );
        discordBot.channels.cache?.get(Config.discord.telegram_id)?.send({
          files: [new AttachmentBuilder(picLink.href)],
          content:
            `${bold(italic(getTelegramName(ctx.message.from)))}` +
            (ctx.message.text?.length > 0 ? `: ${ctx.message.text}` : ""),
        });
      } else {
        discordBot.channels.cache?.get(Config.discord.telegram_id)?.send({
          content: `${bold(italic(getTelegramName(ctx.message.from)))}: ${
            ctx.message.text
          }`,
        });
      }
    }
    next();
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

  telegramBot.catch(async (err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
  });

  const discordBot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent,
    ],
  });

  let dsCommands = new Collection();
  for (let [name, command] of Object.entries(BotCommands)) {
    if (BotCommands[name]) {
      if ("data" in command && "execute" in command) {
        dsCommands.set(command.data.name, command);
      } else {
        console.log(
          `[WARNING] The command ${name} is missing a required "data" or "execute" property.`
        );
      }
    } else {
      console.log(`[WARNING] The command ${name} was not found.`);
    }
  }
  discordBot.commands = dsCommands;

  //handle discord events
  for (const ev in BotEvents) {
    //console.error(`HERE: ${util.inspect(BotEvents[ev], true, null, true)}`);
    if (BotEvents[ev].once) {
      discordBot.once(BotEvents[ev].name, (...args) =>
        BotEvents[ev].execute(discordBot, ...args)
      );
    } else {
      discordBot.on(BotEvents[ev].name, (...args) =>
        BotEvents[ev].execute(discordBot, ...args)
      );
    }
  }

  discordBot.on("messageCreate", async (msg) => {
    if (msg.channelId === Config.discord.telegram_id && !msg.author.bot) {
      //console.log("text: ", util.inspect(msg.cleanContent, true, null, true));

      if (msg.attachments?.size == 1 && msg.attachments?.every(isImage)) {
        telegramBot.telegram.sendPhoto(
          Config.telegram.group_id,
          msg.attachments.first().url,
          {
            caption:
              `<b><i>${msg.member.nickname}</i></b>` +
              (msg.content.length <= 0 ? "" : `: ${msg.cleanContent}`),
            parse_mode: "HTML",
          }
        );
      } else if (msg.attachments?.size > 1 && msg.attachments?.every(isImage)) {
        telegramBot.telegram.sendMediaGroup(
          Config.telegram.group_id,
          msg.attachments.map((a) => {
            return a;
          })
        );
      } else {
        await telegramBot.telegram.sendMessage(
          Config.telegram.group_id,
          `<b><i>${msg.member.nickname}</i></b>: ${msg.cleanContent}`,
          { parse_mode: "HTML" }
        );
      }
    }
  });

  discordBot.on(Events.InteractionCreate, async (interaction) => {
    if (
      !interaction.isChatInputCommand() &&
      !interaction.isButton() &&
      !interaction.isStringSelectMenu() &&
      !interaction.isChannelSelectMenu() &&
      !interaction.isRoleSelectMenu() &&
      !interaction.isModalSubmit()
    ) {
      return;
    }

    //console.log(interaction);

    const command = interaction.isChatInputCommand()
      ? interaction.client.commands.get(interaction.commandName)
      : interaction.client.commands.get(interaction.customId.split("_")[0]);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
    } else {
      try {
        await command.execute(discordBot, interaction);
      } catch (err) {
        console.error(err);
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  });

  discordBot.on(Events.ClientReady, async () => {
    console.log(`Discord: Logged in as ${discordBot.user.username}!`);
    discordBot.user.setActivity("your mother undress", {
      type: ActivityType.Watching,
    });
    //discordBot.channels.cache.get(Config.discord.channel_id)
    //.send(`${discordBot.user.username} reporting for duty!`);
  });

  // *******************************************************************************************************************
  // Run bot
  // *******************************************************************************************************************
  console.log("Starting...");
  telegramBot.launch().then((r) => {
    console.log(`Telegram: Logged in as ${telegramBot.botInfo.username}!`);
  });
  await discordBot.login(Config.discord.token);
});
