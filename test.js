import { Sequelize, DataTypes } from 'sequelize';

//, {logging: false}
const sequelize = new Sequelize('sqlite:beta.sqlite');
const Guild = sequelize.define("Guild", {
	guildId: {
		type: DataTypes.BIGINT,
		allowNull: false,
		defaultValue: -1
	},
	timelyGambleCap: {
		type: DataTypes.INTEGER,
		allowNull: false,
		defaultValue: 10
	},
	gambleDebounce: {
		type:DataTypes.BIGINT,
		allowNull: false,
		defaultValue: 86400000
	}
})
const Rank = sequelize.define("Rank", {
	name: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: ""
	},
	probability: {
		type: DataTypes.NUMBER,
		allowNull: false,
		defaultValue: 0
	},
	sacrifice: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},
	roles: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: ""
	}
})

const User = sequelize.define('User', {
	userId: {
		type: DataTypes.BIGINT,
		allowNull: false,
		defaultValue: -1
	},
	inventory: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: ""
	},
	amountGambled: {
		type: DataTypes.INTEGER,
		allowNull: false,
		defaultValue: 0
	},
	lastGamble: {
		type: DataTypes.BIGINT,
		allowNull: false,
		defaultValue: 0
	}
});

Guild.hasMany(User)
User.belongsTo(Guild)
Guild.hasMany(Rank)
Rank.belongsTo(Guild)

await sequelize.sync();

let firstGuild = Guild.create({guildId: 10})
//let firstGuildsRank = Rank.create({name: "Quandale dingle", probability: 10})
let that = await Guild.findOne({where: {guildId: 10}})
let ranks = await Rank.findAll()
that.addRanks(ranks)
//const users = await User.findAll();