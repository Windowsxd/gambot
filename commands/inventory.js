const {SlashCommandBuilder} = require("discord.js")
const util = require("util")
function splitNoEmpties(str, strsplit) {
	return str.split(strsplit).filter(function(i) {return i != ""})
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("check out your inventory"),
    async execute(interaction, Database) {
		if (!interaction.inGuild()) {
			interaction.reply({content: "Please run this in a guild!", ephemeral: true})
			return null
		}
		let guildData = await Database.models.Guild.findOne({where: {guildId: interaction.guildId}})
		if (!guildData) {
			interaction.reply({content: "The server is broke! weep to admins", ephemeral: true})
			return null
		}
		if ((await guildData.getRanks()).length == 0) {
			interaction.reply({content: "This server is broke! weep to admins", ephemeral: true})
			return null
		}
		let userData = (await guildData.getUsers({where: {userId: interaction.member.id}}))[0]
		if (!userData) {
			interaction.reply({content: "You are broke! go gamble", ephemeral: true})
			return null
		}

		let rolesAmount = 0
		for (var rank of await guildData.getRanks()) {
			rolesAmount += (await rank.getRoles()).length
		}
		let inventory = await userData.getRoles()
		let inventoryString = `You have ${inventory.length}/${rolesAmount} roles:\n`
		for (var role of inventory) {
			inventoryString += `<@&${role.roleId}> `
		}
        //await interaction.deferReply({ephemeral: true})
        interaction.reply(inventoryString)
    }
}