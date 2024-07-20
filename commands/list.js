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
		let totalProbabilityNormal = 0
		let totalProbabilitySacrifice = 0
		let rankTree = ""
		for (let rank of await guildData.getRanks()) {
			if (rank.sacrifice == true) {
				totalProbabilitySacrifice += rank.probability
			} else {
				totalProbabilityNormal += rank.probability
			}
			rankTree += `\n${rank.name} (${rank.probability}%)${rank.sacrifice ? " (Sacrifice)" : ""}: `
			let roles = await rank.getRoles()
			if (roles.length == 0) {
				rankTree += "(No roles found)"
			} else {
				for (let role of roles) {
					rankTree += `\n- <@&${role.roleId}>`
				}
			}
		}
		if (rankTree == "") {
			rankTree = "No ranks found!"
		} else {
			rankTree += `\nIn total: ${totalProbabilityNormal}% chance to obtain a role normally.\n${totalProbabilitySacrifice}% base to obtain a role through sacrifice.`
		}
		interaction.reply(rankTree)
    }
}
