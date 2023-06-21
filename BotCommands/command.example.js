'use strict';
/**
 * Circuit
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
 * @name command.example.js
 * @version 2023/04/20
 * @summary Circuit command
 **/

import util from 'util';
import Config from '../config.js';
import { DB } from '../db.js';

import { Context } from 'telegraf';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";

import { encode } from 'html-entities';
import numeral from 'numeral';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);


export default {
  data: new SlashCommandBuilder()
    .setName('spellname')
    .setDescription('Lorem ipsum.')
    .addIntegerOption(o => o.setName('param1').setDescription('param1').setRequired(false).setMinValue(0).setMaxValue(100))
    .addStringOption(o => o.setName('param2').setDescription('param2').setRequired(false)),
  async execute(interaction) {
    let _p1 = interaction.options.getInteger('param1');
    let _p2 = interaction.options.getString('param2');
    let _reply = await executeCommand({param1: _p1, param2: _p2});
    await interaction.reply(`\`\`\`${_reply}\`\`\``);
  }
};
