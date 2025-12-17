
s = input()
x = input()


for i in range(len(s)-1,-1,-1):
    
    for j in range(len(x)):
        
        if s[i] == x[j]:
            
            print(s[i])
        else:
            continue

