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
 * @name link.js
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
    .setName("link")
    .setDescription("Link your Discord User to your Telegram user.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(client, interaction) {
    //console.log(`INTERACTION: ${util.inspect(interaction, true, 1, true)}`);
    if (interaction.user.id != "346771877211144194") {
      return;
    }
    //interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)

    if (interaction.isChatInputCommand()) {
      let _m = await Member.find({ member_id: null });
      if (_m?.length > 0) {
        let _options = _m.map((o) => {
          return { label: o.member_nickname, value: o.member_telegram };
        });

        let optionsSelect = new StringSelectMenuBuilder()
          .setCustomId("link")
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
      } else {
        interaction.reply({
          embeds: [
            {
              color: 0xff0000,
              title: "Error",
              description: bold(
                "There are no available Telegram users to link to."
              ),
            },
          ],
          ephemeral: true,
        });
      }
    } else if (interaction.isStringSelectMenu()) {
      let _c = client.channels.cache.get(Config.discord.telegram_id);
      let _u = interaction.member;
      let _t = await Member.findOne({ member_telegram: interaction.values[0] });
      if (!_t) {
        await _c.send({
          embeds: [
            {
              color: 0xff0000,
              title: "Error",
              description: bold(
                "You must first use the /start command in Telegram."
              ),
            },
          ],
          ephemeral: true,
        });
      } else {
        _t.member_id = _u.id;
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
                  value: `${_t.member_id} linked to ${_t.member_telegram}`,
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
