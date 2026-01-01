const mongoose = require('mongoose');

const CallSessionSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // farmer
  expert: { type: mongoose.Schema.Types.ObjectId, ref: 'Expert' },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  status: { type: String, enum: ['requested','connected','ended','rejected'], default: 'requested' },
  recordingPath: String // optional if you plan to record server-side
});

module.exports = mongoose.model('CallSession', CallSessionSchema);
