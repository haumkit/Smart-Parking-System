const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

async function callAIService(endpoint, filepath) {
  try {
    const formData = new FormData();
    formData.append("image", fs.createReadStream(filepath));

    const response = await axios.post(`${AI_SERVICE_URL}/api/detect/${endpoint}`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.response?.status === 503) {
      throw new Error("AI service is currently unavailable");
    }
    throw error;
  }
}

async function callAIPlateFromCamera(cameraId) {
  try {
    const response = await axios.get(
      `${AI_SERVICE_URL}/api/detect/plate/from-camera/${cameraId}`,
      { timeout: 15000 }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.response?.status === 503) {
      throw new Error("AI service is currently unavailable");
    }
    throw error;
  }
}

async function callAISlotsFromCamera(cameraId) {
  try {
    const response = await axios.get(
      `${AI_SERVICE_URL}/api/detect/slots/from-camera/${cameraId}`,
      { timeout: 20000 }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.response?.status === 503) {
      throw new Error("AI service is currently unavailable");
    }
    throw error;
  }
}

module.exports = {
  AI_SERVICE_URL,
  callAIService,
  callAIPlateFromCamera,
  callAISlotsFromCamera,
};


