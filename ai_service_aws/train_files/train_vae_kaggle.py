# KAGGLE VAE TRAINING SCRIPT
import os
import tensorflow as tf
from tensorflow.keras import layers, Model
from sklearn.preprocessing import StandardScaler
import numpy as np
import pickle

print("========================================")
print("TRAINING THE VARIATIONAL AUTOENCODER (VAE)")
print("========================================")

# 1. Define VAE Architecture
class Sampling(layers.Layer):
    def call(self, inputs):
        z_mean, z_log_var = inputs
        batch = tf.shape(z_mean)[0]
        dim = tf.shape(z_mean)[1]
        epsilon = tf.keras.backend.random_normal(shape=(batch, dim))
        return z_mean + tf.exp(0.5 * z_log_var) * epsilon

def build_encoder(input_dim, latent_dim=2):
    encoder_inputs = tf.keras.Input(shape=(input_dim,))
    x = layers.Dense(16, activation="relu")(encoder_inputs)
    x = layers.Dense(8, activation="relu")(x)
    z_mean = layers.Dense(latent_dim)(x)
    z_log_var = layers.Dense(latent_dim)(x)
    z = Sampling()([z_mean, z_log_var])
    return Model(encoder_inputs, [z_mean, z_log_var, z], name="encoder")

def build_decoder(latent_dim, original_dim):
    latent_inputs = tf.keras.Input(shape=(latent_dim,))
    x = layers.Dense(8, activation="relu")(latent_inputs)
    x = layers.Dense(16, activation="relu")(x)
    decoder_outputs = layers.Dense(original_dim, activation="linear")(x)
    return Model(latent_inputs, decoder_outputs, name="decoder")

class VAE(Model):
    def __init__(self, encoder, decoder, **kwargs):
        super(VAE, self).__init__(**kwargs)
        self.encoder = encoder
        self.decoder = decoder
        self.total_loss_tracker = tf.keras.metrics.Mean(name="total_loss")
        self.reconstruction_loss_tracker = tf.keras.metrics.Mean(name="reconstruction_loss")
        self.kl_loss_tracker = tf.keras.metrics.Mean(name="kl_loss")

    @property
    def metrics(self):
        return [self.total_loss_tracker, self.reconstruction_loss_tracker, self.kl_loss_tracker]

    def train_step(self, data):
        with tf.GradientTape() as tape:
            z_mean, z_log_var, z = self.encoder(data)
            reconstruction = self.decoder(z)
            reconstruction_loss = tf.reduce_mean(tf.reduce_sum(tf.keras.losses.mse(data, reconstruction)))
            kl_loss = -0.5 * (1 + z_log_var - tf.square(z_mean) - tf.exp(z_log_var))
            kl_loss = tf.reduce_mean(tf.reduce_sum(kl_loss, axis=1))
            total_loss = reconstruction_loss + kl_loss
        grads = tape.gradient(total_loss, self.trainable_weights)
        self.optimizer.apply_gradients(zip(grads, self.trainable_weights))
        self.total_loss_tracker.update_state(total_loss)
        self.reconstruction_loss_tracker.update_state(reconstruction_loss)
        self.kl_loss_tracker.update_state(kl_loss)
        return {"loss": self.total_loss_tracker.result()}

# 2. Generate Synthetic Indian Banking Data
print("Generating 20,000 rows of synthetic Indian banking data for VAE...")
# Amount (₹10 to ₹50000), Time_of_Day (0-24), Sketchiness (0.0-1.0)
amounts = np.random.normal(loc=2500, scale=3000, size=20000)
times = np.random.normal(loc=14, scale=5, size=20000)
sketchiness = np.random.exponential(scale=0.1, size=20000)
data = np.column_stack((np.clip(amounts, 10, 50000), np.clip(times, 0, 24), np.clip(sketchiness, 0, 1.0)))

scaler = StandardScaler()
scaled_data = scaler.fit_transform(data)

with open("vae_scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)

input_dimensions = 3
encoder = build_encoder(input_dim=input_dimensions)
decoder = build_decoder(latent_dim=2, original_dim=input_dimensions)
vae_model = VAE(encoder, decoder)
vae_model.compile(optimizer=tf.keras.optimizers.Adam())

print("Training VAE...")
vae_model.fit(scaled_data, epochs=20, batch_size=64)

print("VAE Training Complete! Weights ready for download.")
vae_model.encoder.save_weights("vae_encoder.weights.h5")
vae_model.decoder.save_weights("vae_decoder.weights.h5")
print("Download 'vae_encoder.weights.h5', 'vae_decoder.weights.h5', and 'vae_scaler.pkl' from Kaggle output.")
