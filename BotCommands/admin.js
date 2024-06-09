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
 * @name linkuser.js
 * @version 2023/04/20
 * @summary Fireman Sam command
 **/

import util from "util";
import Config from "../config.js";
import { DB, Guild, Member } from "../db.js";
import {
  ActionRowBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  roleMention,
  channelMention,
  userMention,
  bold,
  italic,
  underline,
} from "discord.js";

import { encode } from "html-entities";
import numeral from "numeral";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export default {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Administrator commands.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("link")
        .setDescription("Link Discord User to Telegram user.")
        .addUserOption((option) =>
          option.setName("user").setDescription("The Discord user to set.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unlink")
        .setDescription("Unlink Discord User to Telegram user.")
        .addUserOption((option) =>
          option.setName("user").setDescription("The Discord user to unset.").setRequired(true)
        )
    ),

  async execute(client, interaction) {
    //console.log(`INTERACTION: ${util.inspect(interaction, true, 1, true)}`);
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: "Error",
            description: bold("You do not have the required permissions to use this command."),
          },
        ],
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand()) {
      let _user = interaction.options.getUser("user");
      let _subcommand = interaction.options._subcommand;

      if (_subcommand == "link") {
        let _m = await Member.find({});
        if (_m?.length > 0) {
          let _options = _m.map((o) => {
            return { label: o.member_nickname, value: o.member_telegram };
          });

          let optionsSelect = new StringSelectMenuBuilder()
            .setCustomId(`linkuser_${_user.id}`)
            .setPlaceholder(" Options")
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(..._options);

          interaction.reply({
            embeds: [
              {
                color: 0xff0000,
                title: "Choose Telegram user",
              },
            ],
            components: [new ActionRowBuilder().addComponents(optionsSelect)],
            ephemeral: false,
          });
        }
      } else if (_subcommand == "unlink") {
        let _t = await Member.findOneAndUpdate(
          { member_telegram: _user.id },
          { member_discord: undefined }
        );
        if (!_t) {
          await client.channels.cache.get(Config.discord.channel_id).send({
            embeds: [
              {
                color: 0xff0000,
                title: "Error",
                description: bold("Error while trying to unlink user."),
              },
            ],
            ephemeral: true,
          });
        } else {
          await client.channels.cache.get(Config.discord.channel_id).send({
            embeds: [
              {
                color: 0xff0000,
                title: "Success",
                description: bold("User unlinked."),
              },
            ],
            ephemeral: true,
          });
        }
      }
    } else if (interaction.isStringSelectMenu()) {
      let _c = client.channels.cache.get(Config.discord.channel_id);
      let _u = interaction.guild.members.cache.get(interaction.customId.split("_")[1]);
      let _t = await Member.findOne({ member_telegram: interaction.values[0] });
      if (!_t) {
        await _c.send({
          embeds: [
            {
              color: 0xff0000,
              title: "Error",
              description: bold("The user must first use the /start command in Telegram."),
            },
          ],
          ephemeral: true,
        });
      } else {
        _t.member_discord = _u.id;
        _t.member_nickname = _u.nickname;
        await _t.save();

        await _c.send({
          embeds: [
            {
              color: 0x0099ff,
              title: _t.member_nickname,
              fields: [
                {
                  name: "",
                  value: `${_t.member_discord} linked to ${_t.member_telegram}`,
                  inline: false,
                },
              ],
            },
          ],
          ephemeral: false,
        });
      }
      interaction.deleteReply();
      return interaction.deferUpdate();
    }
  },
};
