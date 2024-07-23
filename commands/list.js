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
		let rankTreeClusters = [[]]
		let rankTreeClusterIndex = 0
		function clusterPush(string) {
			if ((rankTreeClusters[rankTreeClusterIndex].join("\n")+"\n"+string).length >= 2000) {
				rankTreeClusterIndex += 1
				rankTreeClusters.push([])
			}
			rankTreeClusters[rankTreeClusterIndex].push(string)
		}
		for (let rank of await guildData.getRanks()) {
			if (rank.sacrifice == true) {
				totalProbabilitySacrifice += rank.probability
			} else {
				totalProbabilityNormal += rank.probability
			}
			let roles = await rank.getRoles()
			let rankString = `${rank.name} (${rank.probability}%)${rank.sacrifice ? " (Sacrifice)" : ""}${roles.length == 0? " (No roles found)": ": "}`
			clusterPush(rankString)
			if (roles.length > 0) {
				for (let role of roles) {
					clusterPush(`- <@&${role.roleId}>`)
				}
			}
		}
		if (rankTreeClusters[0].length == 0) {
			clusterPush("No ranks found!")
		} else {
			clusterPush(`In total: ${totalProbabilityNormal}% chance to obtain a role normally.\n${totalProbabilitySacrifice}% base to obtain a role through sacrifice.`)
		}
		let replied = false
		for (let cluster of rankTreeClusters) {
			if (replied == true) {
				await interaction.followUp(cluster.join("\n"))
			} else {
				await interaction.reply(cluster.join("\n"))
				replied = true
			}
		}
    }
}
