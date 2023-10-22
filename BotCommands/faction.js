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
 * @name faction.js
 * @version 2023/04/22
 * @summary Fireman Sam command
 **/

import util from "util";
import Config from "../config.js";
import { DB, Faction } from "../db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, roleMention, userMention } from "discord.js";

import { TornAPI } from "ts-torn-api";
import { encode } from "html-entities";
import numeral from "numeral";
import dayjs from "dayjs";


let _factions = await Faction.find();


export default {
  data: new SlashCommandBuilder()
    .setName("faction")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addSubcommand(subcommand => subcommand
      .setName("info")
      .setDescription("Display faction info.")
      .addStringOption(option => option
        .setName("faction")
        .setRequired(true)
        .addChoices(
          { name: "Dumpster Fire", value: "48912" },
          { name: "DF Fight Club", value: "50700" }
        )
      )
    ),
  async execute(client, interaction) {
    
    let _faction = interaction.options.getString("faction");
    let fac = await Faction.findOne({faction_id: _faction.faction_id});
    if(fac != null) {
      let embed = {
        color: 0xCC6600,
        title: fac.faction_name,
        url: `https://www.torn.com/factions.php?step=profile&ID=${fac.faction_id}`,
        thumbnail: { url: `https://factiontags.torn.com/${fac.faction_tag_image}` },
        fields: [
          { name: "Age", value: fac.faction_age, inline: true },
          { name: "Respect", value: numeral(fac.faction_respect).format("0,0"), inline: true }
        ],
        timestamp: new Date().toISOString(),
      };


      interaction.reply({ embeds: [embed] });
    } else {
      interaction.reply({ content: "Error" });
    }
  }
};
