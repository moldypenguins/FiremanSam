"use strict";
/**
 * Fireman Sam
 * Copyright (c) 2023 Craig Roberts
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
 * @summary When he hears the fire bell chime, Fireman Sam is there on time.
 **/

import util from "util";

import Config from "./config.js";
import { DB, Guild, Message, Member } from "./db.js";

import { Telegraf } from "telegraf";
import { message, editedMessage } from "telegraf/filters";

import {
  ActivityType,
  AttachmentBuilder,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
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
      const data = await rest.put(Routes.applicationCommands(Config.discord.client_id), {
        body: botCommands,
      });
      console.log(`Reloaded ${data.length} discord commands.`);
    } catch (err) {
      console.error(err);
    }
    process.exit(0);
  })();
}

//##################################################################################################

async function getTelegramName(user) {
  let name = null;
  //lookup link in database
  let _member = await Member.findOne({ member_telegram: user.id });
  if (_member) {
    name = _member.member_nickname;
  } else {
    //use telegram identification
    if (user.username) {
      name = user.username;
    } else {
      name = `${user.first_name}` + (user.last_name ? ` ${user.last_name}` : "");
    }
  }
  return name;
}

function isImage(attachment, index, array) {
  return attachment?.contentType?.startsWith("image");
}

//##################################################################################################

//connect to database
DB.connection.once("open", async () => {
  // ##############################################################################################
  // Telegram
  // ##############################################################################################
  const telegramBot = new Telegraf(Config.telegram.token);

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

  telegramBot.on("message_reaction", async (ctx) => {
    if (ctx.messageReaction?.new_reaction?.length > 0) {
      let _link = await Message.findOne({
        message_telegram: ctx.messageReaction.message_id,
        message_type: "discord",
      });
      if (_link) {
        let _c = discordBot.channels.cache.get(Config.discord.channel_id);
        let _message = await _c.messages.fetch(_link.message_discord);
        if (_message) {
          _message.reply(
            `${bold(italic(await getTelegramName(ctx.messageReaction.user)))}: ${ctx.messageReaction.new_reaction[0].emoji}`
          );
        }
      }
    }
  });

  telegramBot.on(editedMessage("text"), async (ctx) => {
    //TODO: test messages with images, etc.
    if (ctx.editedMessage?.text) {
      let _link = await Message.findOne({
        message_telegram: ctx.editedMessage.message_id,
        message_type: "telegram",
      });
      if (_link) {
        let _c = discordBot.channels.cache.get(Config.discord.channel_id);
        let _message = await _c.messages.fetch(_link.message_discord);
        if (_message) {
          _message.edit(
            `${bold(italic(await getTelegramName(ctx.editedMessage.from)))}: ${ctx.editedMessage.text}`
          );
        }
      }
    }
  });

  telegramBot.use(async (ctx, next) => {
    //console.log("MSG: ", util.inspect(ctx.message, true, null, true));
    //check for unknown groups
    if (
      ctx.message?.chat?.id == Config.telegram.group_id &&
      !ctx.message?.from?.is_bot &&
      ctx.message?.chat?.type !== "private" &&
      !ctx.message?.entities?.filter((e) => e.type === "bot_command")?.length > 0
    ) {
      //check is reply
      let _link;
      if (ctx.has(message("reply_to_message"))) {
        _link = await Message.findOne({
          message_telegram: ctx.update.message.reply_to_message.message_id,
          message_type: "discord",
        });
      }
      let _c = discordBot.channels.cache.get(Config.discord.channel_id);
      let _content;
      if (ctx.has(message("photo"))) {
        let picLink = await telegramBot.telegram.getFileLink(ctx.message.photo.pop().file_id);
        _content = {
          files: [new AttachmentBuilder(picLink.href)],
          content:
            `${bold(italic(await getTelegramName(ctx.message.from)))}` +
            (ctx.message.caption?.length > 0 ? `: ${ctx.message.caption}` : ""),
        };
      } else if (ctx.has(message("animation"))) {
        let picLink = await telegramBot.telegram.getFileLink(ctx.message.animation.file_id);
        _content = {
          files: [new AttachmentBuilder(picLink.href)],
          content:
            `${bold(italic(await getTelegramName(ctx.message.from)))}` +
            (ctx.message.caption?.length > 0 ? `: ${ctx.message.caption}` : ""),
        };
      } else if (ctx.has(message("sticker"))) {
        let picLink = await telegramBot.telegram.getFileLink(ctx.message.sticker.file_id);
        _content = {
          files: [new AttachmentBuilder(picLink.href)],
          content: `${bold(italic(await getTelegramName(ctx.message.from)))}`,
        };
      } else if (ctx.has(message("video"))) {
        let vidLink = await telegramBot.telegram.getFileLink(ctx.message.video.file_id);
        _content = {
          files: [new AttachmentBuilder(vidLink.href)],
          content:
            `${bold(italic(await getTelegramName(ctx.message.from)))}` +
            (ctx.message.caption?.length > 0 ? `: ${ctx.message.caption}` : ""),
        };
      } else if (ctx.has(message("document"))) {
        if (ctx.message.document.mime_type.toLowerCase().startsWith("image")) {
          let docLink = await telegramBot.telegram.getFileLink(ctx.message.document.file_id);
          _content = {
            files: [new AttachmentBuilder(docLink.href)],
            content:
              `${bold(italic(await getTelegramName(ctx.message.from)))}` +
              (ctx.message.caption?.length > 0 ? `: ${ctx.message.caption}` : ""),
          };
        }
      } else if (ctx.has(message("text"))) {
        _content = {
          content: `${bold(italic(await getTelegramName(ctx.message.from)))}: ${ctx.message.text}`,
        };
      }
      if (_content) {
        let _sent;
        if (_link) {
          //reply
          let _message = await _c.messages.fetch(_link.message_discord);
          if (_message) {
            _sent = await _message.reply(_content);
          }
        } else {
          //message
          _sent = await _c.send(_content);
        }
        if (_sent) {
          await new Message({
            _id: new DB.Types.ObjectId(),
            message_type: "telegram",
            message_discord: _sent.id,
            message_telegram: ctx.message.message_id,
            message_time: new Date(ctx.message.date),
          }).save();
        }
      }
    }
    await next();
  });

  telegramBot.start(async (ctx) => {
    if (!(await Member.exists({ member_telegram: ctx.message.from.id }))) {
      await new Member({
        _id: new DB.Types.ObjectId(),
        member_nickname: await getTelegramName(ctx.message.from),
        member_telegram: ctx.message.from.id,
      }).save();
      ctx.replyWithHTML("You can now link your Discord user to your Telegram user.");
    } else {
      ctx.replyWithHTML("You already did this.");
    }
  });

  telegramBot.help(async (ctx) => {
    ctx.replyWithHTML("🎶 <i>When he hears the fire bell chime, Fireman Sam is there on time.</i>");
  });

  telegramBot.catch(async (err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}\n`, err);
  });

  // ##############################################################################################
  // Discord
  // ##############################################################################################
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
    partials: [Partials.Message, Partials.Reaction],
  });

  // ##############################################################################################
  // Discord Commands
  // ##############################################################################################
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

  // ##############################################################################################
  // Discord Events
  // ##############################################################################################
  for (const ev in BotEvents) {
    //console.error(`HERE: ${util.inspect(BotEvents[ev], true, null, true)}`);
    if (BotEvents[ev].once) {
      discordBot.once(BotEvents[ev].name, (...args) => BotEvents[ev].execute(discordBot, ...args));
    } else {
      discordBot.on(BotEvents[ev].name, (...args) => BotEvents[ev].execute(discordBot, ...args));
    }
  }

  // ##############################################################################################
  // Discord MessageReactionAdd
  // ##############################################################################################
  discordBot.on(Events.MessageReactionAdd, async (reaction, user) => {
    // When a reaction is received, check if the structure is partial.
    // If the message this reaction belongs to was removed,
    //   the fetching might result in an API error which should be handled
    try {
      if (reaction.partial) {
        reaction = await reaction.fetch();
      }
      let _message = await Message.findOne({
        message_discord: reaction.message.id,
        message_type: "telegram",
      });
      if (_message) {
        let _member = reaction.message.guild.members.cache.get(user.id);
        //console.log(`"${reaction.emoji.name} from ${_member.nickname}`);
        await telegramBot.telegram.sendMessage(
          Config.telegram.group_id,
          `<b><i>${_member.nickname}</i></b>: ${reaction.emoji.name}`,
          { reply_to_message_id: _message.message_telegram, parse_mode: "HTML" }
        );
      }
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      return;
    }
  });

  // ##############################################################################################
  // Discord MessageCreate
  // ##############################################################################################
  discordBot.on(Events.MessageCreate, async (message) => {
    if (message.channelId === Config.discord.channel_id && !message.author.bot) {
      //console.log("text: ", util.inspect(msg.cleanContent, true, null, true));
      let _link;
      if (message.reference?.messageId) {
        _link = await Message.findOne({
          message_discord: message.reference.messageId,
          message_type: "telegram",
        });
      }
      let _response;
      if (message.stickers?.size >= 1) {
        _response = await telegramBot.telegram.sendPhoto(
          Config.telegram.group_id,
          message.stickers.first().url.replace("cdn.discordapp.com", "media.discordapp.net"),
          {
            caption:
              `<b><i>${message.member.nickname}</i></b>` +
              (message.content.length <= 0 ? "" : `: ${message.cleanContent}`),
            show_caption_above_media: true,
            parse_mode: "HTML",
            reply_to_message_id: _link ? _link.message_telegram : undefined,
          }
        );
      } else if (message.attachments?.size == 1 && message.attachments?.every(isImage)) {
        try {
          _response = await telegramBot.telegram.sendPhoto(
            Config.telegram.group_id,
            message.attachments.first().url,
            {
              caption:
                `<b><i>${message.member.nickname}</i></b>` +
                (message.content.length <= 0 ? "" : `: ${message.cleanContent}`),
              show_caption_above_media: "True",
              parse_mode: "HTML",
              reply_to_message_id: _link ? _link.message_telegram : undefined,
            }
          );
        } catch (err) {
          console.log(`Error sending photo.\n${err}`);
        }
      } else if (message.attachments?.size > 1 && message.attachments?.every(isImage)) {
        //TODO: test functionality
        _response = await telegramBot.telegram.sendMediaGroup(
          Config.telegram.group_id,
          message.attachments.map(
            (att) => {
              return {
                media: att.url,
                caption: att.caption,
                type: "photo",
              };
            },
            { parse_mode: "HTML", reply_to_message_id: _link ? _link.message_telegram : undefined }
          )
        );
      } else {
        try {
          //TODO: handle cleanContent starting with /
          _response = await telegramBot.telegram.sendMessage(
            Config.telegram.group_id,
            `<b><i>${message.member.nickname}</i></b>: ${message.cleanContent.replace(/(\W)\/(\w+[^.]+)/gi, "$1$2")}`,
            { parse_mode: "HTML", reply_to_message_id: _link ? _link.message_telegram : undefined }
          );
        } catch (err) {
          console.log(`Error sending message.\n${err}`);
        }
      }
      if (_response) {
        await new Message({
          _id: new DB.Types.ObjectId(),
          message_type: "discord",
          message_discord: message.id,
          message_telegram: _response.message_id,
          message_time: new Date(message.createdAt),
        }).save();
      }
    }
  });

  // ##############################################################################################
  // Discord MessageUpdate
  // ##############################################################################################
  discordBot.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (newMessage.channelId === Config.discord.channel_id && !newMessage.author.bot) {
      if (oldMessage.id) {
        let _link = await Message.findOne({
          message_discord: oldMessage.id,
          message_type: "discord",
        });
        if (_link) {
          await telegramBot.telegram.editMessageText(
            Config.telegram.group_id,
            Number(_link.message_telegram),
            undefined,
            `<b><i>${newMessage.member.nickname}</i></b>: ${newMessage.cleanContent}`,
            { parse_mode: "HTML" }
          );
        }
      }
    }
  });

  // ##############################################################################################
  // Discord InteractionCreate
  // ##############################################################################################
  discordBot.on(Events.InteractionCreate, async (interaction) => {
    console.log(`INTERACTION:\n${util.inspect(interaction, true, null, true)}`);
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

    const command = interaction.isChatInputCommand()
      ? interaction.client.commands.get(interaction.commandName)
      : interaction.client.commands.get(interaction.customId.split("_")[0]);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
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
    console.log(`DiscordBot: Logged in as ${discordBot.user.tag}!`);
    discordBot.user.setActivity(
      "When he hears the fire bell chime, Fireman Sam is there on time.",
      {
        type: ActivityType.Custom,
      }
    );
  });

  //TODO: add more error handling here
  discordBot.on(Events.ShardError, (err) => {
    console.error(`DiscordBot (ShardError):\n${err}`);
  });
  discordBot.on(Events.Error, (err) => {
    console.error(`DiscordBot (Error):\n${err}`);
  });

  // ##############################################################################################
  // Run bots
  // ##############################################################################################
  console.log("Starting...");
  telegramBot
    .launch({ allowedUpdates: ["message", "message_reaction", "edited_message"] }, () => {
      console.log(`TelegramBot: Logged in as ${telegramBot.botInfo.username}!`);
    })
    .catch(async (err) => {
      // polling has errored
      console.log("Ooops, polling has errored\n", err);
      await gracefulShutdown("SIGTERM");
    });
  await discordBot.login(Config.discord.token);

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled promise rejection:", err);
  });
  // ##############################################################################################
  // Graceful Shutdown
  // ##############################################################################################
  process.on("SIGINT", async () => {
    await gracefulShutdown("SIGINT");
  });
  process.on("SIGTERM", async () => {
    await gracefulShutdown("SIGTERM");
  });

  async function gracefulShutdown(signal) {
    console.log(`\n${signal}: Attempting to gracefully shut down.`);
    try {
      telegramBot.stop(signal);
      console.log(`${signal}: Telegram bot stopped.`);
      await discordBot.destroy();
      console.log(`${signal}: Discord bot stopped.`);
      await DB.connection.close(false);
      console.log(`${signal}: MongoDB connection closed.`);
      process.exit(0);
    } catch (err) {
      console.log(`${signal}: Encountered an error while attempting to gracefully shut down.`);
      process.exit(1);
    }
  }
});
