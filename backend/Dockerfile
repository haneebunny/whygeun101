# 1. 자바 17버전이 깔려있는 컴퓨터(리눅스) 환경을 가져와!
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app

# 2. 우리 backend 폴더에 있는 모든 코드를 도커 안으로 복사해!
COPY . .

# 3. 코끼리(gradlew)한테 실행 권한을 주고, 빌드(포장)를 시작해!
RUN chmod +x ./gradlew
RUN ./gradlew clean build -x test

# 4. 8080번 포트를 열어둬!
EXPOSE 8080

# 5. 서버를 켤 때 이 명령어를 실행해!
ENTRYPOINT ["sh", "-c", "java -jar build/libs/*-SNAPSHOT.jar"]