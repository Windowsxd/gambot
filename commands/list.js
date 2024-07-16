const {SlashCommandBuilder} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    	.setName("list")
    	.setDescription("List all roles and ranks"),
    async execute(interaction, Database) {
		if (!interaction.inGuild()) {
			interaction.reply({content: "Please run this in a guild!", ephemeral: true})
			return null
		}
		let guildData = await Database.models.Guild.findOne({where: {guildId: interaction.guildId}})
		if (!guildData) {
			interaction.reply("This server is poor....")
			return null
		}
		let totalProbability = 0
		let rankTree = ""
		for (let rank of await guildData.getRanks()) {
			totalProbability += rank.probability
			rankTree += `\n${rank.name} (${rank.probability}%): `
			let roles = await rank.getRoles()
			if (roles.length == 0) {
				rankTree += "(No roles found)"
			} else {
				for (let role of roles) {
					console.log(role.roleId)
					rankTree += `\n- <@&${role.roleId}>`
				}
			}
		}
		if (rankTree == "") {
			rankTree = "No ranks found!"
		} else {
			rankTree += `\nIn total: ${totalProbability}% chance to obtain a role.`
		}
		interaction.reply(rankTree)
    }
}
