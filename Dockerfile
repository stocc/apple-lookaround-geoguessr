FROM python
COPY . .
RUN pip install -r requirements.txt
CMD flask run --host=0.0.0.0 --port=$PORT
