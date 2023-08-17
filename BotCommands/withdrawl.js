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
import { DB } from "../db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, roleMention, userMention } from "discord.js";

import { TornAPI } from "ts-torn-api";
import { encode } from "html-entities";
import numeral from "numeral";
import dayjs from "dayjs";

export default {
  data: new SlashCommandBuilder()
    .setName("withdrawl")
    .setDescription("Create a new withdrawl request.")
    .addStringOption(o => o.setName("amount").setDescription("Amount to withdrawl").setRequired(true))
    .addStringOption(o => o.setName("online").setDescription("Verify online before send").setRequired(true).setChoices({name: "Yes", value: "Yes", default: true}, {name: "No", value: "No"}))
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  async execute(client, interaction) {
    let bankers = await interaction.guild.roles.cache.get(Config.torn.bank.role_id).members.map(m => m.user.id);
    
    if(interaction.isButton()) {
      let command = interaction.customId.split("_")[1];
      let row = ActionRowBuilder.from(interaction.message.components[0]);
      let embed = EmbedBuilder.from(interaction.message.embeds[0]);

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
                "custom_id": "withdrawl_refresh"
              },
              {
                "type": 2,
                "label": "Complete",
                "style": 3,
                "custom_id": "withdrawl_complete"
              }
            ]
          };

          let uid = interaction.message.embeds[0].title.match(/\[\d+\]/)[0].replace(/[\[\]]/g, "");
          const tUser = await client.Torn.user.user(uid);
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
          let uid = interaction.message.embeds[0].title.match(/\[\d+\]/)[0].replace(/[\[\]]/g, "");
          const tUser = await client.Torn.user.user(uid);
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
          .setCustomId("withdrawl_close")
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
            .setCustomId("withdrawl_close")
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
    else {

      let _amount = interaction.options.getString("amount");
      let _online = interaction.options.getString("online");
      console.log(`Amount: ${_amount}`);
      console.log(`Online: ${_online}`);


      let iUser = await interaction.guild.members.fetch(interaction.user.id);


      let thread = client.channels.cache.get(Config.torn.bank.channel_id).threads.cache.find(t => t.name === `${iUser.nickname} - Withdrawl Request`);

      if(!thread) {
        thread = await client.channels.cache.get(Config.torn.bank.channel_id).threads.create({
          name: `${iUser.nickname} - Withdrawl Request`,
          autoArchiveDuration: 60,
          type: ChannelType.PrivateThread,
          reason: "Withdrawl Request",
        });
      }

      await thread.members.add(interaction.user.id);

      //could loop through bankrs here but easier to just mention them in message
      //await thread.members.add(Config.torn.bank.role_id);
      
      console.log(`Created/updated thread: ${thread.name}`);

      let embed = {
        color: 0x0099FF,
        title: thread.name,
        author: { name: iUser.username },
        fields: [
          { name: "Amount", value: _amount, inline: true },
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
            "custom_id": "withdrawl_claim"
          },
          {
            "type": 2,
            "label": "Cancel",
            "style": 4,
            "custom_id": "withdrawl_cancel"
          }
        ]
      };


      let message = await thread.send({ content: `${roleMention(Config.torn.bank.role_id)}`, embeds: [embed], components: [row] });
      //let message = await thread.send({ content: "banker", embeds: [embed], components: [row] });

      //TODO: add message id to a withdrawl request record in db


      interaction.reply({ content: "A bank teller will be with you shortly.", ephemeral: true });
    }
  }
};
