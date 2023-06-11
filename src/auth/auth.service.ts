import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from 'src/user/user.dto';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private UserService: UserService){}

    // 회원가입
    async register(userDto: CreateUserDto){
        // 이미 가입된 유저가 있는지 체크
        const user = await this.UserService.getUser(userDto.email);
        if(user){
            throw new HttpException(
                '해당 유저가 이미 있습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        // 비밀번호 암호화
        const encryptedPassword = bcrypt.hashSync(userDto.password, 10);

        // DB에 저장
        try{
            const user = await this.UserService.createUser({
                ...userDto,
                password: encryptedPassword,
            });

            user.password = undefined;
            return user;
        }catch(error){
            throw new HttpException('서버 에러', 500);
        }

    }


    // 유저정보 검증
    async validateUser(email: string, password: string){
        const user = await this.UserService.getUser(email);
        
        // 유저가 없으면 검증 실패
        if(!user){
            return null;
        }

        const { password: hashedPassword, ...userInfo} = user;
        if(bcrypt.compareSync(password, hashedPassword)){
            return userInfo;
        }
        return null;

    }
    
}
