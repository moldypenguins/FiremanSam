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
 * @name withdrawl.js
 * @version 2023/04/22
 * @summary Fireman Sam command
 **/

import util from "util";
import Config from "../config.js";
import { DB, Faction } from "../db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, roleMention, userMention } from "discord.js";

import { TornAPI } from "ts-torn-api";
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
    .setName("withdrawl")
    .setDescription("Create a new withdrawl request.")
    .addIntegerOption(o => o.setName("amount").setDescription("Amount to withdrawl").setRequired(true))
    .addStringOption(o => o.setName("online").setDescription("Verify online before send").setRequired(true).setChoices({name: "No", value: "No", default: true}, {name: "Yes", value: "Yes"}))
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  async execute(client, interaction) {
    //console.log(`INTERACTION: ${util.inspect(interaction, true, 1, true)}`);
  
    if (interaction.isChatInputCommand()) {
      let _amount = interaction.options.getInteger("amount");
      let _online = interaction.options.getString("online");
        
      let iUser = await interaction.guild.members.fetch(interaction.user.id);
      //console.log(`USER: ${util.inspect(iUser, true, 1, true)}`);
  
      let _faction = null;
      let _factions = await Faction.find({faction_type: "faction"});
      for(let _f = 0; _f < _factions.length; _f++) {
        if(iUser._roles.includes(_factions[_f].faction_member_role)) {
          _faction = _factions[_f];
          break;
        }
      }
      if(_faction) {
        let thread = client.channels.cache.get(_faction.faction_bank_channel).threads.cache.find(t => t.name === `${iUser.nickname} - Withdrawl Request`);
  
        if(!thread) {
          thread = await client.channels.cache.get(_faction.faction_bank_channel).threads.create({
            name: `${iUser.nickname} - Withdrawl Request`,
            autoArchiveDuration: 60,
            type: ChannelType.PrivateThread,
            reason: "Withdrawl Request",
          });
        }
    
        await thread.members.add(interaction.user.id);
  
        let embed = {
          color: 0x0099FF,
          title: thread.name,
          author: { name: iUser.username },
          fields: [
            { name: "Amount", value: `$${numeral(_amount).format("0,0")}`, inline: true },
            { name: "Verify Online", value: _online, inline: true }
          ],
          timestamp: new Date().toISOString(),
        };
        let row = {
          "type": 1,
          "components": [
            {
              "type": 2,
              "label": "Claim",
              "style": 1,
              "custom_id": `withdrawl_${_faction.faction_id}_claim`
            },
            {
              "type": 2,
              "label": "Cancel",
              "style": 4,
              "custom_id": `withdrawl_${_faction.faction_id}_cancel`
            }
          ]
        };
  
        let message = await thread.send({ content: `${roleMention(_faction.faction_banker_role)}`, embeds: [embed], components: [row] });
  
        interaction.reply({ content: "A bank teller will be with you shortly.", ephemeral: true });
      }
  
  
  
  
  
  
  
    } else if(interaction.isButton()) {
      let faction = interaction.customId.split("_")[1];
      let command = interaction.customId.split("_")[2];
      let row = ActionRowBuilder.from(interaction.message.components[0]);
      let embed = EmbedBuilder.from(interaction.message.embeds[0]);

      console.log(`USER: ${util.inspect(faction, true, 1, true)}`);
  
      let _faction = await Faction.findOne({faction_id: parseInt(faction)});
      let bankers = await interaction.guild.roles.cache.get(_faction.faction_banker_role).members.map(m => m.user.id);
  
      switch(command) {
      case "claim":
        if(bankers.includes(interaction.user.id)) {
          let row = {
            "type": 1,
            "components": [
              {
                "type": 2,
                "label": "Refresh",
                "style": 1,
                "custom_id": `withdrawl_${_faction.faction_id}_refresh`
              },
              {
                "type": 2,
                "label": "Complete",
                "style": 3,
                "custom_id": `withdrawl_${_faction.faction_id}_complete`
              }
            ]
          };
          
          let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);
          let uid = interaction.message.embeds[0].title.match(/\[\d+\]/)[0].replace(/[\[\]]/g, "");
          const tUser = await torn.user.user(uid);
          // check for error
          if (TornAPI.isError(tUser)) {
            console.log(`${tUser.code}: ${tUser.error}`);
          } else {
            //console.log(`status: ${tUser.last_action.status}`);
            embed.addFields({ name: "User Status", value: `${tUser.last_action.status}` });
          }
          embed.addFields({ name: "Claimed By", value: `${userMention(interaction.user.id)}` });
          interaction.message.edit({ embeds: [embed], components: [row] });
        }
        break;
      case "refresh":
        if(bankers.includes(interaction.user.id)) {
          let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);
          let uid = interaction.message.embeds[0].title.match(/\[\d+\]/)[0].replace(/[\[\]]/g, "");
          const tUser = await torn.user.user(uid);
          // check for error
          if (TornAPI.isError(tUser)) {
            console.log(`${tUser.code}: ${tUser.error}`);
          } else {
            //console.log(`status: ${tUser.last_action.status}`);
            embed.data.fields.find(f => f.name == "User Status").value = `${tUser.last_action.status}`;
          }
          interaction.message.edit({ embeds: [embed] });
        }
        break;
      case "cancel":
        row.components.find(c => c.data.label == "Claim").setDisabled(true);
        row.components.find(c => c.data.label == "Cancel").setDisabled(true);
        row.components.push(new ButtonBuilder()
          .setCustomId(`withdrawl_${_faction.faction_id}_close`)
          .setLabel("Close")
          .setStyle(ButtonStyle.Danger)
        );
        interaction.message.edit({ components: [row] });
        break;
      case "complete":
        if(bankers.includes(interaction.user.id)) {
          row.components.find(c => c.data.label == "Complete").setDisabled(true);
          row.components.find(c => c.data.label == "Refresh").setDisabled(true);
          row.components.push(new ButtonBuilder()
            .setCustomId(`withdrawl_${_faction.faction_id}_close`)
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger)
          );
          interaction.message.edit({ components: [row] });
        }
        break;
      case "close":
        if(bankers.includes(interaction.user.id)) {
          interaction.channel.delete();
        }
        break;
      }
      
      return interaction.deferUpdate();
    }
  }
};
