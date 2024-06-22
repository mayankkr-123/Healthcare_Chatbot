from flask import Flask, request, jsonify
import re
import pandas as pd
import pyttsx3
from sklearn import preprocessing
from sklearn.tree import DecisionTreeClassifier, _tree
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.svm import SVC
import warnings
import csv

app = Flask(__name__)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Load the training and testing data
training = pd.read_csv(r'C:\Users\Admin\OneDrive\Desktop\chatbot\Training.csv')
testing = pd.read_csv(r'C:\Users\Admin\OneDrive\Desktop\chatbot\Testing.csv')
cols = training.columns[:-1]
x = training[cols]
y = training['prognosis']

# Encode the target variable
le = preprocessing.LabelEncoder()
le.fit(y)
y = le.transform(y)

# Split the data into training and testing sets
x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.33, random_state=42)

# Train a Decision Tree classifier
clf = DecisionTreeClassifier()
clf.fit(x_train, y_train)
scores = cross_val_score(clf, x_test, y_test, cv=3)
print("Decision Tree cross-validation scores mean:", scores.mean())

# Train an SVM classifier
svm_model = SVC()
svm_model.fit(x_train, y_train)
print("SVM accuracy:", svm_model.score(x_test, y_test))

# Function to perform text-to-speech
def readn(nstr):
    engine = pyttsx3.init()
    engine.setProperty('voice', "english+f5")
    engine.setProperty('rate', 130)
    engine.say(nstr)
    engine.runAndWait()
    engine.stop()

# Global dictionaries for data
severityDictionary = {}
description_list = {}
precautionDictionary = {}

# Function to calculate condition based on symptoms and days
def calc_condition(exp, days):
    sum_severity = sum(severityDictionary[item] for item in exp)
    if (sum_severity * days) / (len(exp) + 1) > 13:
        return "You should take the consultation from a doctor."
    else:
        return "It might not be that bad, but you should take precautions."

# Function to load description data
def getDescription():
    global description_list
    with open(r'C:\Users\Admin\OneDrive\Desktop\chatbot\symptom_Description.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        for row in csv_reader:
            description_list[row[0]] = row[1]

# Function to load severity data
def getSeverityDict():
    global severityDictionary
    with open(r'C:\Users\Admin\OneDrive\Desktop\chatbot\Symptom_severity.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        for row in csv_reader:
            severityDictionary[row[0]] = int(row[1])

# Function to load precaution data
def getprecautionDict():
    global precautionDictionary
    with open(r'C:\Users\Admin\OneDrive\Desktop\chatbot\symptom_precaution.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        for row in csv_reader:
            precautionDictionary[row[0]] = row[1:5]

# Function to check pattern in symptoms
def check_pattern(dis_list, inp):
    pred_list = []
    inp = inp.replace(' ', '_')
    patt = f"{inp}"
    regexp = re.compile(patt)
    pred_list = [item for item in dis_list if regexp.search(item)]
    return 1 if pred_list else 0, pred_list

# Function for secondary prediction
def sec_predict(symptoms_exp):
    df = pd.read_csv(r'C:\Users\Admin\OneDrive\Desktop\chatbot\Training.csv')
    X = df.iloc[:, :-1]
    y = df['prognosis']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=20)
    rf_clf = DecisionTreeClassifier()
    rf_clf = rf_clf.fit(X_train, y_train)
    input_data = np.zeros(len(X.columns))
    for symptom in symptoms_exp:
        if symptom in X.columns:
            input_data[X.columns.get_loc(symptom)] = 1
    prediction = rf_clf.predict([input_data])
    return le.inverse_transform(prediction)[0]

@app.route('/predict', methods=['POST'])
def predict():
    symptoms = request.json['symptoms']
    symptoms_exp = [symptom.strip() for symptom in symptoms.split(',')]
    second_prediction = sec_predict(symptoms_exp)
    return jsonify({'prediction': second_prediction})

if __name__ == '__main__':
    app.run(debug=True)
