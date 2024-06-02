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
 * @name config.js
 * @version 2023/04/20
 * @summary Fireman Sam command
 **/

import util from "util";
import Config from "../config.js";
import { DB, Faction, Guild } from "../db.js";
import {
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  roleMention,
  channelMention,
  userMention,
} from "discord.js";

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
    .setName("config")
    .setDescription("Configure bot settings.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addSubcommand((subcommand) =>
      subcommand.setName("guild").setDescription("Configure guild")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("factions").setDescription("Configure factions")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("alliance").setDescription("Configure alliance")
    ),

  async execute(client, interaction) {
    //console.log(`INTERACTION: ${util.inspect(interaction, true, 1, true)}`);

    if (interaction.isChatInputCommand()) {
      let _subcommand = interaction.options._subcommand;
      if (_subcommand == "guild") {
        let _g = await Guild.findOne({ guild_id: interaction.guildId });

        interaction.reply({
          embeds: [
            {
              color: 0x0099ff,
              title: _g.guild_name,
              fields: [{ name: "", value: "**Setting:**", inline: false }],
            },
          ],
          ephemeral: false,
        });
      } else if (_subcommand == "factions") {
        let _factions = await Faction.find({ faction_type: "faction" });
        let _embeds = [];
        let _options = [
          new StringSelectMenuOptionBuilder({ label: "+ New", value: "new" }),
        ];
        for (let _f in _factions) {
          _embeds.push({
            color: 0x0099ff,
            title: _factions[_f].faction_name,
            fields: [
              {
                name: "",
                value: `**Member Role:** ${roleMention(
                  _factions[_f].faction_member_role
                )}`,
                inline: false,
              },
              {
                name: "",
                value: `**Banker Role:** ${roleMention(
                  _factions[_f].faction_banker_role
                )}`,
                inline: false,
              },
              {
                name: "",
                value: `**Bank Channel:** ${channelMention(
                  _factions[_f].faction_bank_channel
                )}`,
                inline: false,
              },
            ],
          });
          _options.push(
            new StringSelectMenuOptionBuilder({
              label: `${_factions[_f].faction_name}`,
              value: `${_factions[_f].faction_id}`,
            })
          );
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId("config_factions")
          .setPlaceholder("Select faction to configure");
        select.options = _options;

        interaction.reply({
          embeds: _embeds,
          components: [new ActionRowBuilder().addComponents(select)],
          ephemeral: false,
        });
      } else if (_subcommand == "alliance") {
        let _factions = await Faction.find({ faction_type: "alliance" });
        let _embeds = [];
        for (let _f in _factions) {
          _embeds.push({
            color: 0x0099ff,
            title: _factions[_f].faction_name,
            fields: [
              {
                name: "",
                value: `**Member Role:** ${roleMention(
                  _factions[_f].faction_member_role
                )}`,
                inline: false,
              },
            ],
          });
        }

        interaction.reply({ embeds: _embeds, ephemeral: false });
      }
    } else if (interaction.isStringSelectMenu()) {
      console.log(
        `CUSTOMID: ${util.inspect(interaction.customId, true, 1, true)}`
      );
      let _command = interaction.customId.split("_")[1];

      if (_command == "factions") {
        if (interaction.values[0] == "new") {
          const modal = new ModalBuilder()
            .setCustomId("config_faction_add")
            .setTitle("Add Faction");

          const factionIdInput = new TextInputBuilder()
            .setCustomId("faction_id")
            .setLabel("Faction ID")
            .setStyle(TextInputStyle.Short);

          const factionTypeInput = new TextInputBuilder()
            .setCustomId("faction_type")
            .setLabel("Faction Type")
            .setPlaceholder("alliance | faction")
            .setStyle(TextInputStyle.Short);

          modal.addComponents(
            new ActionRowBuilder().addComponents(factionIdInput),
            new ActionRowBuilder().addComponents(factionTypeInput)
          );

          await interaction.showModal(modal);
        } else {
          let _f = await Faction.findOne({ faction_id: interaction.values[0] });
          const member_role_select = new RoleSelectMenuBuilder()
            .setCustomId(`config_faction_${_f.faction_id}_member`)
            .setPlaceholder("Select a member role");
          const banker_role_select = new RoleSelectMenuBuilder()
            .setCustomId(`config_faction_${_f.faction_id}_banker`)
            .setPlaceholder("Select a member role");
          const bank_channel_select = new ChannelSelectMenuBuilder()
            .setCustomId(`config_faction_${_f.faction_id}_bankchannel`)
            .setPlaceholder("Select a channel");

          interaction.reply({
            embeds: [
              {
                color: 0x0099ff,
                title: _f.faction_name,
                fields: [
                  {
                    name: "",
                    value: `**Member Role:** ${roleMention(
                      _f.faction_member_role
                    )}`,
                    inline: false,
                  },
                  {
                    name: "",
                    value: `**Banker Role:** ${roleMention(
                      _f.faction_banker_role
                    )}`,
                    inline: false,
                  },
                  {
                    name: "",
                    value: `**Banker Channel:** ${roleMention(
                      _f.faction_bank_channel
                    )}`,
                    inline: false,
                  },
                ],
              },
            ],
            components: [
              new ActionRowBuilder().addComponents(member_role_select),
              new ActionRowBuilder().addComponents(banker_role_select),
              new ActionRowBuilder().addComponents(bank_channel_select),
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    label: "Done",
                    style: 3,
                    custom_id: `config_faction_${_f.faction_id}_done`,
                  },
                  {
                    type: 2,
                    label: "Delete",
                    style: 4,
                    custom_id: `config_faction_${_f.faction_id}_delete`,
                  },
                ],
              },
            ],
            ephemeral: false,
          });

          interaction.message.delete();
        }
      }
    } else if (interaction.isRoleSelectMenu()) {
      console.log(
        `CUSTOMID: ${util.inspect(interaction.customId, true, 1, true)}`
      );
      let _command = interaction.customId.split("_")[1];
      let _faction = interaction.customId.split("_")[2];
      let _field = interaction.customId.split("_")[3];

      if (_command == "faction" && _faction && _field) {
        let result = null;
        if (_field == "member") {
          result = await Faction.updateOne(
            { faction_id: _faction },
            { faction_member_role: `${interaction.values[0]}` }
          );
        } else if (_field == "banker") {
          result = await Faction.updateOne(
            { faction_id: _faction },
            { faction_banker_role: `${interaction.values[0]}` }
          );
        }

        if (result) {
          let _f = await Faction.findOne({ faction_id: _faction });
          interaction.message.edit({
            embeds: [
              {
                color: 0x0099ff,
                title: _f.faction_name,
                fields: [
                  {
                    name: "",
                    value: `**Member Role:** ${roleMention(
                      _f.faction_member_role
                    )}`,
                    inline: false,
                  },
                  {
                    name: "",
                    value: `**Banker Role:** ${roleMention(
                      _f.faction_banker_role
                    )}`,
                    inline: false,
                  },
                  {
                    name: "",
                    value: `**Bank Channel:** ${channelMention(
                      _f.faction_bank_channel
                    )}`,
                    inline: false,
                  },
                ],
              },
            ],
            ephemeral: false,
          });
          return interaction.deferUpdate();
        }
      }
    } else if (interaction.isChannelSelectMenu()) {
      console.log(
        `CUSTOMID: ${util.inspect(interaction.customId, true, 1, true)}`
      );
      let _command = interaction.customId.split("_")[1];
      let _faction = interaction.customId.split("_")[2];
      let _field = interaction.customId.split("_")[3];

      if (_command == "faction" && _faction && _field) {
        let result = null;
        if (_field == "bankchannel") {
          result = await Faction.updateOne(
            { faction_id: _faction },
            { faction_bank_channel: `${interaction.values[0]}` }
          );
        }

        if (result) {
          let _f = await Faction.findOne({ faction_id: _faction });
          interaction.message.edit({
            embeds: [
              {
                color: 0x0099ff,
                title: _f.faction_name,
                fields: [
                  {
                    name: "",
                    value: `**Member Role:** ${roleMention(
                      _f.faction_member_role
                    )}`,
                    inline: false,
                  },
                  {
                    name: "",
                    value: `**Banker Role:** ${roleMention(
                      _f.faction_banker_role
                    )}`,
                    inline: false,
                  },
                  {
                    name: "",
                    value: `**Bank Channel:** ${channelMention(
                      _f.faction_bank_channel
                    )}`,
                    inline: false,
                  },
                ],
              },
            ],
            ephemeral: false,
          });
          return interaction.deferUpdate();
        }
      }
    } else if (interaction.isButton()) {
      //console.log(`INTERACTION: ${util.inspect(interaction, true, 1, true)}`);
      let _command = interaction.customId.split("_")[1];
      let _faction = interaction.customId.split("_")[2];
      let _action = interaction.customId.split("_")[3];

      if (_command == "faction" && _faction && _action == "done") {
        interaction.message.delete();
      } else if (_command == "faction" && _faction && _action == "delete") {
        if (await Faction.deleteOne({ faction_id: _faction })) {
          interaction.message.delete();
        }
      }

      return interaction.deferUpdate();
    } else if (interaction.isModalSubmit()) {
      //console.log(`INTERACTION: ${util.inspect(interaction, true, 2, true)}`);
      let _command = interaction.customId.split("_")[1];
      let _action = interaction.customId.split("_")[2];

      if (_command == "faction" && _action == "add") {
        const faction_id = interaction.fields.getTextInputValue("faction_id");
        const faction_type =
          interaction.fields.getTextInputValue("faction_type");

        let result = await Faction.api_add(faction_id, faction_type);

        //console.log(`FACTIONID: ${util.inspect(result, true, 2, true)}`);

        if (result) {
          interaction.reply({
            embeds: [
              {
                color: 0x0099ff,
                title: result.faction_name,
                fields: [
                  {
                    name: "",
                    value: `**Member Role:** ${roleMention(
                      result.faction_member_role
                    )}`,
                    inline: false,
                  },
                  {
                    name: "",
                    value: `**Banker Role:** ${roleMention(
                      result.faction_banker_role
                    )}`,
                    inline: false,
                  },
                  {
                    name: "",
                    value: `**Bank Channel:** ${channelMention(
                      result.faction_bank_channel
                    )}`,
                    inline: false,
                  },
                ],
              },
            ],
            ephemeral: false,
          });
          interaction.message.delete();
          //return interaction.deferUpdate();
        }
      }
    }
  },
};
