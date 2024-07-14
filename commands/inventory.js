const {SlashCommandBuilder} = require("discord.js")
const util = require("util")
const OWNERS = [219486752484622336]
module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("check out your inventory"),
    async execute(interaction, database) {
        //await interaction.deferReply({ephemeral: true})
        interaction.reply("Inventory not implemented yet!")
    }
}