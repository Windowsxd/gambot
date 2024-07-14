const {SlashCommandBuilder} = require("discord.js");
const GAMBLECAPCOOLDOWN = 86400000
function formatTimestamp(timestamp) {
	timestamp = timestamp/1000
    const seconds = Math.floor(timestamp % 60);
    const minutes = Math.floor(timestamp / 60) % 60;
    const hours = Math.floor(timestamp / 3600) % 24;
    const days = Math.floor(timestamp / 86400);
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}, and ${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}, and ${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}, and ${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
}

function randInt(max) {return Math.floor(Math.random() * max)}

function splitNoEmpties(str, strsplit) {
	return str.split(strsplit).filter(function(i) {return i != ""})
}

module.exports = {
    data: new SlashCommandBuilder()
    	.setName("gamble")
    	.setDescription("gamble for roles!!!!"),
    async execute(interaction, database) {
		let startTime = Date.now()
		if (interaction.member == null) {
			interaction.reply("DM's are not yet supported")
			return null
		}
        if (database.query(`SELECT guildId FROM Guilds WHERE guildId=${interaction.guildId};`).all().length == 0) {
			interaction.reply("The server has not been initialized! Please contact an administrator of this server and beg them to set it up.")
            return null
       	}
        let guildData = database.query(`SELECT * FROM Guilds WHERE guildId=${interaction.guildId};`).all()[0]
		if (guildData.ranks == "") {
			interaction.reply("This server has no ranks to gamble for! Please contact an administrator, and weep.")
			return null
		}
        if (guildData.roles == "") {
			interaction.reply("This server does not have any roles to gamble for! Please contact an administator, and cry.")
			return null
		}
		if (database.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='User_${interaction.member.id}';`).all().length == 0) {
            database.query(`CREATE TABLE User_${interaction.member.id} (guildId, inventory, amountGambled, firstGamble);`).run()
       	}
		if (database.query(`SELECT guildId from User_${interaction.member.id} WHERE guildId=${interaction.guildId};`).all().length == 0) {
			//the first time this user uses this command in this server
			database.query(`INSERT INTO User_${interaction.member.id} (guildId, inventory, amountGambled) VALUES (${interaction.guildId}, '', 0);`).run()
			console.log(`First time user ${interaction.member.id} gambled in ${interaction.guildId}, created index`)
		}
		let userData = database.query(`SELECT * from User_${interaction.member.id} WHERE guildId=${interaction.guildId};`).all()[0]
		var allRanks = splitNoEmpties(guildData.ranks, "|")
		var allRoles = splitNoEmpties(guildData.roles, "|")
		var randomNum = Math.random()
		var totalProbability = 0
		for (rankCluster of allRanks) {
			rankCluster = rankCluster.split(":")
			totalProbability += parseFloat(rankCluster[1])
		}
		var currentTime = Date.now()
		if (userData.firstGamble == null) {
			database.query(`UPDATE User_${interaction.member.id} SET firstGamble = ${currentTime} WHERE guildId=${interaction.guildId};`).run()
			userData.firstGamble = currentTime
		}
		if (userData.amountGambled >= guildData.dailyGambleCap) {
			if (currentTime - userData.firstGamble < GAMBLECAPCOOLDOWN) {
				interaction.reply({content: `You hit the gambling limit! Try again in ${formatTimestamp(GAMBLECAPCOOLDOWN - (currentTime - userData.firstGamble))}`, ephemeral: true})
				return null
			} else {
				database.query(`UPDATE User_${interaction.member.id} SET firstGamble = ${currentTime} WHERE guildId=${interaction.guildId};`).run()
				userData.amountGambled = 0
				userData.firstGamble = currentTime
			}
		}
		database.query(`UPDATE User_${interaction.member.id} SET amountGambled = ${userData.amountGambled+1} WHERE guildId=${interaction.guildId};`).run()
		totalProbability = totalProbability/100
		var goneThrough = 0
		for (rankCluster of allRanks) {
			rankCluster = rankCluster.split(":")
			if (parseFloat(rankCluster[1]) == 0) {continue}
			var chanceForRank = parseFloat(rankCluster[1])/100
			if (randomNum <= chanceForRank+goneThrough && randomNum > goneThrough) { //acquired this rank of roles
				//now roll for a role
				var rankRoles = allRoles.filter(function(role) {return role.split(":")[1] == rankCluster[0]})
				if (rankRoles.length == 0) { //They cant win anything!
					interaction.reply("You would have gotten something, but no roles exist in this rank! go cry to admins.")
				}
				var randomRole = rankRoles[randInt(rankRoles.length-1)]
				var userInventory = splitNoEmpties(userData.inventory, "|")
				var roleId = randomRole.split(":")[0]
				if (userInventory.includes(roleId)) { //the user already has this role, make them lose
					break
				} else {
					userInventory.push(roleId)
					database.query(`UPDATE User_${interaction.member.id} SET inventory = '${userInventory.join("|")}' WHERE guildId=${interaction.guildId};`).run()
					interaction.reply(`You got <@&${roleId}> (rank ${rankCluster[0]} role!)`)
				}
				return null
			}
			goneThrough += chanceForRank
		}
		// If the total probability is greater than 1, we need to resize all probabilities to add up to 1
		interaction.reply(`L you lost loser`)
		console.log(`Command took ${(Date.now() - startTime)/1000} seconds`)
    }
}
