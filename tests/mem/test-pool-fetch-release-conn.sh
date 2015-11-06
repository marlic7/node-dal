#!/bin/bash

echo
ab -c 10 -n 1000000 http://localhost:7000/
