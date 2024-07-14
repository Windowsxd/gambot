const {SlashCommandBuilder} = require("discord.js");

function findRank(allRanks, rank) {
	// allRanks should be structured like so: [ "rankName:probability", "rankName:probability" ]
	var rankIndex = -1
	for (var rankClusterIndex in allRanks) {
		var rankCluster = allRanks[rankClusterIndex].split(":")
		if (rankCluster[0] == rank) { //the rank already exists
			rankIndex = rankClusterIndex
			break
		}
	}
	return rankIndex
}

function splitNoEmpties(str, strsplit) {
	return str.split(strsplit).filter(function(i) {return i != ""})
}

module.exports = {
    data: new SlashCommandBuilder()
    	.setName("admin")
    	.setDescription("All Admin commands")
		.addSubcommand(subcommand =>
			subcommand.setName("list")
			.setDescription("List all roles and parent ranks from the database")
		)
		.addSubcommandGroup(subcommandGroup =>
			subcommandGroup.setName("role")
			.setDescription("Manage roles in gambling database")
			.addSubcommand(subcommand =>
				subcommand.setName("add")
				.setDescription("Add role to gambling database")
				.addRoleOption(option =>
					option.setName("role")
					.setDescription("The role to add to database")
					.setRequired(true)
				)
				.addStringOption(option =>
					option.setName("rank")
					.setDescription("Rank of the role")
					.setRequired(true)
				)
			)
			.addSubcommand(subcommand =>
				subcommand.setName("remove")
				.setDescription("Removes a role from the gambling database")
				.addRoleOption(option =>
					option.setName("role")
					.setDescription("Role to remove")
					.setRequired(true)
				)
			)
		)
		.addSubcommandGroup(subCommandGroup =>
			subCommandGroup.setName("rank")
			.setDescription("Manage ranks in gambling database")
			.addSubcommand(subcommand =>
				subcommand.setName("add")
				.setDescription("Add a rank to the gambling database")
				.addStringOption(option =>
					option.setName("rank")
					.setDescription("Name of the rank")
					.setRequired(true)
				)
				.addNumberOption(option =>
					option.setName("probability")
					.setDescription("Probability of getting a role from this rank when gambling (0%-100%)")
					.setMinValue(0)
					.setRequired(true)
					.setMaxValue(100)
				)
			)
			.addSubcommand(subcommand =>
				subcommand.setName("remove")
				.setDescription("Remove a rank from the gambling database")
				.addStringOption(option =>
					option.setName("rank")
					.setDescription("Name of the rank")
					.setRequired(true)
				)
			)
		),
    async execute(interaction, database) {
        if (database.query(`SELECT guildId FROM Guilds WHERE guildId=${interaction.guildId};`).all().length == 0) {
            database.query(`INSERT INTO Guilds (guildId, roles, dailyGambleCap, ranks) VALUES (${interaction.guildId}, '', 10, '');`).run()
            console.log(`Guild ${interaction.guildId} has no place in the database, creating!`)
       	}
        let guildData = database.query(`SELECT * FROM Guilds WHERE guildId=${interaction.guildId};`).all()[0]
        switch (interaction.options.getSubcommandGroup()) {
            case "role":
                switch (interaction.options.getSubcommand()) {
                    case "add":
                        var role = interaction.options.getRole("role")
                        var rank = interaction.options.getString("rank")
						// check if the rank exists
						if (role.id == interaction.guildId) {
							interaction.reply({content: "You cannot use the role @everyone.", ephemeral: true})
							break
						}
						if (findRank(splitNoEmpties(guildData.ranks, "|"), rank) == -1) { //rank doesnt exist in the database
							interaction.reply({content: `Rank \`${rank}\` doesn't exist in the database.`, ephemeral: true})
							break
						}
						var allRoles = splitNoEmpties(guildData.roles, "|")
						if (findRank(allRoles, `${role.id}`) != -1) { //the role already exists in the database
							interaction.reply({content: `Role <@&${role.id}> already exists in the database.`, ephemeral: true})
							break
						}
						allRoles.push(`${role.id}:${rank}`)
						//At this point, it passed the conditions to be added to the database
						var constructedRoles = allRoles.join("|")
						database.query(`UPDATE Guilds SET roles = '${constructedRoles}' WHERE guildId=${interaction.guildId};`).run()
						interaction.reply({content: `Successfully added <@&${role.id}> to ${rank}!\nMake sure <@&${role.id}> is beneath this bot's highest role.`, ephemeral: true})
                        break
                    case "remove":
                        var role = interaction.options.getRole("role")
						var allRoles = splitNoEmpties(guildData.roles, "|")
						var roleIndex = findRank(allRoles, `${role.id}`)
						if (roleIndex == -1) { //the role already exists in the database
							interaction.reply({content: `Role <@&${role.id}> doesn't exist in the database.`, ephemeral: true})
							break
						}
						allRoles.splice(roleIndex, 1)
						//At this point, it passed the conditions to be added to the database
						var constructedRoles = allRoles.join("|")
						database.query(`UPDATE Guilds SET roles = '${constructedRoles}' WHERE guildId=${interaction.guildId};`).run()
						interaction.reply({content: `Successfully removed <@&${role.id}>!`, ephemeral: true})
                        break
                }
                break
            case "rank":
                switch (interaction.options.getSubcommand()) {
                    case "add":
                        var requestedRank = interaction.options.getString("rank")
                        var probability = interaction.options.getNumber("probability")
                        var allRanks = splitNoEmpties(guildData.ranks, "|") // Should be structured like so: [ "rankName:probability" ]
                        var rankExists = false
                        var totalProbability = 0
                        for (let rankClusterString of allRanks) {
							if (rankClusterString == "") {continue}
                            let rankCluster = rankClusterString.split(":")
                            if (rankCluster[0] == requestedRank) { //the rank already exists
                                rankExists = true
                            }
                            totalProbability += parseFloat(rankCluster[1])
                        }
                        if (rankExists) {
                            interaction.reply({content: `The rank ${requestedRank} already exists! try a different name.`, ephemeral: true})
                            break
                        }
                        allRanks.push(`${requestedRank}:${probability}:0`)
                        let constructedRanks = allRanks.join("|")
                        database.query(`UPDATE Guilds SET ranks = '${constructedRanks}' WHERE guildId=${interaction.guildId};`).run()
                        interaction.reply({content: `Successfully created ${requestedRank} with a chance of ${probability}% to appear. The total probability is now ${totalProbability+probability}%.`, ephemeral: true})
                        break
                    case "remove":
                        var requestedRank = interaction.options.getString("rank")
                        var allRanks = splitNoEmpties(guildData.ranks, "|") // Should be structured like so: [ "rankName:probability" ]
                        var totalProbability = 0
                        var rankRemoved = false
                        for (let rankClusterIndex in allRanks) {
                            let rankCluster = allRanks[rankClusterIndex].split(":")
                            if (rankCluster[0] == requestedRank) { //the rank already exists
                                rankRemoved = rankClusterIndex
                            } else {
                                totalProbability += parseFloat(rankCluster[1])
                            }
                        }
                        if (rankRemoved) {
                            allRanks.splice(rankRemoved, 1)
                            let constructedRanks = allRanks.join("|")
                            database.query(`UPDATE Guilds SET ranks = '${constructedRanks}' WHERE guildId=${interaction.guildId};`).run()
                            interaction.reply({content: `Removed rank ${requestedRank}. The total probability is now ${totalProbability}%.`, ephemeral: true})
                        } else {
                            interaction.reply({content: `The rank ${requestedRank} doesn't exist! try a different name.`, ephemeral: true})
                            break
                        }
                        break
                }
  		}
		if (interaction.options.getSubcommand() == "list") {
			var rankTree = "" 
			var allRanks = splitNoEmpties(guildData.ranks, "|")
			var allRoles = splitNoEmpties(guildData.roles, "|")
			var totalProbability = 0
			for (rankClusterString of allRanks) {
				var rankCluster = rankClusterString.split(":")
				rankTree += `${rankCluster[0]}: ${rankCluster[1]}%`
				totalProbability += parseFloat(rankCluster[1])
				var rolesString = ""
				for (var role of allRoles) {
					role = splitNoEmpties(role, ":")
					if (role[1] == rankCluster[0]) {
						rolesString += `- <@&${role[0]}>\n`
					}
				}
				if (rolesString == "") {
					rankTree += " (No roles found)\n"
				} else {
					rankTree += "\n"+rolesString
				}
			}
			if (rankTree == "") {
				rankTree = "No ranks found!"
			} else {
				rankTree += `Total probability is ${totalProbability}%.`
			}
			interaction.reply({content: rankTree, ephemeral: true})
		}
    }
}
