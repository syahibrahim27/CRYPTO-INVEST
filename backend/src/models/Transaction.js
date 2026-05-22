import mongoose from 'mongoose';


const txSchema = new mongoose.Schema({
userId: { type: mongoose.Types.ObjectId, ref: 'User' },
type: { type: String, enum: ['deposit', 'withdraw', 'bonus'] },
amount: Number,
status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
meta: Object
}, { timestamps: true });


export default mongoose.model('Transaction', txSchema);