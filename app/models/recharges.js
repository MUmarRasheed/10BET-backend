
/* eslint no-unused-vars: "off" */
let mongoose = require('mongoose')
let Schema = mongoose.Schema
let Global = require('../global/settings')

let rechargeSchema = new Schema({
	userId: { type: Number, unique: true, index: true },
	dateCreated: { type: Number },
	role : { type: String },
	amount: { type : Number },
	updatedAt: { type: Number },
	createdAt: { type: Number },
    rechargedBy : { type : String },
	loadedAmount: { type: Number },
	loadedBy: { type : String },
	createdBy: { type: String }
})

rechargeSchema.plugin(Global.aggregatePaginate)
rechargeSchema.plugin(Global.paginate)

rechargeSchema.pre('save', function (next) {
	var now = new Date().getTime() / 1000
	if (!this.createdAt) {
		this.createdAt = now
		this.dateCreated = now
		this.updatedAt = now
	} else {
		this.updatedAt = now
	}
	next()
})

const Recharge = mongoose.model('recharge', rechargeSchema)
// Recharge.createIndexes()

module.exports = Recharge
