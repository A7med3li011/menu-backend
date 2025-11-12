import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkout: {
    type: Date,
  },
  shiftDate: {
    type: Date,
    required: true,
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  marked: {
    type: Boolean,
    default: false,
  },
  lateBy: {
    type: Number, // in minutes
    default: 0,
  },
  workedMinutes: {
  type: Number,
  default: 0,
},
});

const attendanceModel = mongoose.model("attendance", attendanceSchema);

export default attendanceModel;
// hello deploy 
